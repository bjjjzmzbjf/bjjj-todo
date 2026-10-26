function updateHTML(id,html){
 const target=document.getElementById(id);if(target.__renderedHTML===html)return;
 const positions=[];for(let el=target;el;el=el.parentElement)positions.push([el,el.scrollTop,el.scrollLeft]);
 const x=window.scrollX,y=window.scrollY;target.innerHTML=html;target.__renderedHTML=html;
 for(const [el,top,left] of positions){el.scrollTop=top;el.scrollLeft=left;}window.scrollTo(x,y);
}
function applyAppearance(state){
 const layer=document.getElementById('wallpaper');if(!layer)return;
 layer.style.backgroundImage=state.background?`url("${state.background}")`:'';
 document.body.classList.toggle('custom-background',!!state.background);
 document.documentElement.style.setProperty('--veil',String((state.settings.backgroundDim??75)/100));
}
