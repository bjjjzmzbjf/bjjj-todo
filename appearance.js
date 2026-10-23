function applyAppearance(state){
 const layer=document.getElementById('wallpaper');if(!layer)return;
 layer.style.backgroundImage=state.background?`url("${state.background}")`:'';
 document.body.classList.toggle('custom-background',!!state.background);
 document.documentElement.style.setProperty('--veil',String((state.settings.backgroundDim??75)/100));
}
