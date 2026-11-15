"""Specialized residual-code decoding; leaves the reference voice model intact."""
from types import SimpleNamespace


class FixedCodePredictor:
    """Replace the fixed 15-token nested HF loop, preserving sampling settings."""
    def __init__(self, predictor):
        import torch
        self.torch = torch
        self.predictor = predictor
        self.original = predictor.generate
        self.backend = "fixed-loop"
        self.graph = None
        self.static_input = None
        self.static_output = None
        self.positions = [torch.arange(2, device=predictor.device)] + [torch.tensor([i + 1], device=predictor.device) for i in range(1, 15)]
        mask = torch.full((1, 1, 2, 2), float("-inf"), device=predictor.device, dtype=predictor.dtype)
        self.prefill_mask = torch.triu(mask, diagonal=1)

    def sample(self, logits, do_sample, temperature, top_k):
        torch = self.torch
        logits = logits[:, -1, :].float()
        if not do_sample:
            return logits.argmax(dim=-1, keepdim=True)
        if temperature != 1:
            logits = logits / temperature
        if top_k:
            threshold = torch.topk(logits, min(top_k, logits.shape[-1]))[0][:, -1:]
            logits = logits.masked_fill(logits < threshold, float("-inf"))
        return torch.multinomial(torch.softmax(logits, dim=-1), num_samples=1)

    def run(self, inputs_embeds, do_sample=True, temperature=.9, top_k=50):
        from transformers.cache_utils import DynamicCache
        torch = self.torch
        cache = DynamicCache()
        generated = []
        token = None
        for step in range(15):
            position = self.positions[step]
            result = self.predictor(
                inputs_embeds=inputs_embeds if step == 0 else None,
                input_ids=token if step else None,
                past_key_values=cache, use_cache=True,
                attention_mask={"full_attention": self.prefill_mask if step == 0 else None},
                position_ids=position.unsqueeze(0), cache_position=position,
                generation_steps=step, output_hidden_states=False,
                return_dict=True,
            )
            token = self.sample(result.logits, do_sample, temperature, top_k)
            generated.append(token)
        return torch.cat(generated, dim=-1)

    def capture(self, inputs_embeds):
        """Capture only the fixed-shape residual predictor, not dynamic text AR."""
        torch = self.torch
        self.static_input = torch.zeros_like(inputs_embeds)
        stream = torch.cuda.Stream()
        stream.wait_stream(torch.cuda.current_stream())
        with torch.cuda.stream(stream):
            for _ in range(2):
                self.run(self.static_input)
        torch.cuda.current_stream().wait_stream(stream)
        graph = torch.cuda.CUDAGraph()
        with torch.cuda.graph(graph):
            self.static_output = self.run(self.static_input)
        self.graph = graph
        self.backend = "cuda-graph"

    def __call__(self, *args, **kwargs):
        inputs = kwargs.get("inputs_embeds")
        supported = not args and inputs is not None and inputs.shape[:2] == (1, 2) and kwargs.get("max_new_tokens") == 15 and kwargs.get("top_p", 1.0) == 1.0
        if not supported:
            return self.original(*args, **kwargs)
        do_sample = kwargs.get("do_sample", True)
        temperature = kwargs.get("temperature", .9)
        top_k = kwargs.get("top_k", 50)
        if self.graph is not None and do_sample and temperature == .9 and top_k == 50:
            self.static_input.copy_(inputs)
            self.graph.replay()
            tokens = self.static_output.clone()
        else:
            tokens = self.run(inputs, do_sample, temperature, top_k)
        return SimpleNamespace(sequences=tokens)


def install_predictor(model, capture=True):
    import torch
    predictor = model.model.talker.code_predictor
    accelerated = FixedCodePredictor(predictor)
    if capture:
        hidden = model.model.talker.config.hidden_size
        sample = torch.zeros((1, 2, hidden), dtype=predictor.dtype, device=predictor.device)
        try:
            accelerated.capture(sample)
        except (RuntimeError, ValueError):
            # A different CUDA/runtime may not support graph capture. The exact
            # fixed loop remains available without changing the model or voice.
            accelerated.graph = None
            accelerated.static_input = accelerated.static_output = None
            accelerated.backend = "fixed-loop"
    predictor.generate = accelerated
    return accelerated
