export const LANGUAGES = [
  {code:'zh',name:'Simplified Chinese',nativeName:'中文',locale:'zh-CN'},
  {code:'en',name:'English',nativeName:'English',locale:'en'},
  {code:'es',name:'Spanish',nativeName:'Español',locale:'es'},
  {code:'fr',name:'French',nativeName:'Français',locale:'fr'},
  {code:'de',name:'German',nativeName:'Deutsch',locale:'de'},
  {code:'ja',name:'Japanese',nativeName:'日本語',locale:'ja'},
  {code:'ko',name:'Korean',nativeName:'한국어',locale:'ko'},
];
export const normalizeLanguage = value => LANGUAGES.some(item=>item.code===value) ? value : 'en';
export const languageInfo = value => LANGUAGES.find(item=>item.code===normalizeLanguage(value));
