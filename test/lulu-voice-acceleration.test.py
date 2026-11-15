from pathlib import Path
from types import SimpleNamespace
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from lulu_voice_acceleration import FixedCodePredictor

try:
    import torch
    import transformers
    HAS_RUNTIME = True
except ImportError:
    HAS_RUNTIME = False

@unittest.skipUnless(HAS_RUNTIME, "Optional local voice runtime is unavailable")
class PredictorTests(unittest.TestCase):
    def test_fixed_loop_uses_fifteen_correct_heads_and_preserves_fallback(self):
        calls = []
        class Predictor:
            device, dtype = "cpu", torch.float32
            def generate(self, *args, **kwargs):
                return "original"
            def __call__(self, **kwargs):
                step = kwargs["generation_steps"]
                calls.append(kwargs)
                logits = torch.full((1, 2 if step == 0 else 1, 20), -10.)
                logits[:, -1, step] = 10
                return SimpleNamespace(logits=logits)
        accelerated = FixedCodePredictor(Predictor())
        result = accelerated(inputs_embeds=torch.zeros(1, 2, 4), max_new_tokens=15, do_sample=False)
        self.assertEqual(result.sequences.tolist(), [list(range(15))])
        self.assertEqual(len(calls), 15)
        self.assertTrue(all(call["use_cache"] and not call["output_hidden_states"] for call in calls))
        self.assertTrue(all(call["past_key_values"] is calls[0]["past_key_values"] for call in calls))
        self.assertEqual(accelerated(inputs_embeds=torch.zeros(2, 2, 4), max_new_tokens=15), "original")

    def test_sampling_matches_temperature_and_top_k_processing(self):
        from transformers.generation.logits_process import TemperatureLogitsWarper, TopKLogitsWarper
        class Predictor:
            device, dtype = "cpu", torch.float32
            def generate(self, *args, **kwargs):
                pass
        accelerated = FixedCodePredictor(Predictor())
        logits = torch.arange(100, dtype=torch.float32).reshape(1, 1, -1) / 10
        scores = TemperatureLogitsWarper(.9)(None, logits[:, -1].clone())
        scores = TopKLogitsWarper(50)(None, scores)
        torch.manual_seed(88)
        expected = torch.multinomial(torch.softmax(scores, dim=-1), 1)
        torch.manual_seed(88)
        actual = accelerated.sample(logits, True, .9, 50)
        self.assertTrue(torch.equal(actual, expected))

if __name__ == "__main__":
    unittest.main()
