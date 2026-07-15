(function () {
  "use strict";
  const logic = window.DATE_WHEEL_LOGIC;
  const config = window.DATE_WHEEL_CONFIG;
  if (!logic || !config) return;
  const colors = ["#b9566a", "#d68a68", "#d1a751", "#5f9b8e", "#4d7895", "#7d6795", "#a96883", "#8d7a61", "#c26855", "#4f8a78", "#6570a2", "#9a635c"];
  const items = logic.normalizeItems(config.items);
  const el = { eyebrow:document.querySelector("#eyebrow"),title:document.querySelector("#title"),instruction:document.querySelector("#instruction"),group:document.querySelector("#wheel-group"),list:document.querySelector("#item-list"),button:document.querySelector("#spin-button"),prefix:document.querySelector("#result-prefix"),label:document.querySelector("#result-label"),detail:document.querySelector("#result-detail"),error:document.querySelector("#config-error") };
  let rotation = 0;
  let spinning = false;
  applyText();
  if (items.length < 2) {
    el.error.textContent = "请在 config.js 中准备 2–12 个有效候选。";
    el.button.disabled = true;
    return;
  }
  renderList();
  renderWheel();
  el.button.addEventListener("click", spin);

  function applyText() {
    el.eyebrow.textContent = String(config.eyebrow ?? "");
    el.title.textContent = String(config.title ?? "今晚做什么？");
    el.instruction.textContent = String(config.instruction ?? "");
    el.button.textContent = String(config.spinButtonText ?? "转一次");
  }
  function renderList() {
    el.list.replaceChildren(...items.map((item) => { const li=document.createElement("li"); li.textContent=item.label; return li; }));
  }
  function renderWheel() {
    const segment = 360 / items.length;
    const nodes = [];
    items.forEach((item,index) => {
      const start=-90+index*segment,end=start+segment;
      const path=document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d",sectorPath(200,200,184,start,end)); path.setAttribute("fill",colors[index%colors.length]); path.setAttribute("class","slice");
      const text=document.createElementNS("http://www.w3.org/2000/svg","text");
      const point=polar(200,200,122,start+segment/2); text.setAttribute("x",point.x); text.setAttribute("y",point.y); text.setAttribute("class","slice-label"); text.textContent=item.label.length>8?`${item.label.slice(0,8)}…`:item.label;
      nodes.push(path,text);
    });
    el.group.replaceChildren(...nodes);
  }
  function spin() {
    if (spinning) return;
    spinning=true; el.button.disabled=true; el.button.textContent="正在决定…";
    const values=new Uint32Array(1); crypto.getRandomValues(values);
    const index=logic.pickIndex(logic.uint32ToUnit(values[0]),items.length);
    rotation=logic.getTargetRotation(rotation,index,items.length,4);
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.group.style.transition=reduced?"none":"transform 3.2s cubic-bezier(.16,.72,.18,1)";
    requestAnimationFrame(() => { el.group.style.transform=`rotate(${rotation}deg)`; });
    window.setTimeout(() => finish(index), reduced?30:3250);
  }
  function finish(index) {
    const item=items[index]; el.prefix.textContent=String(config.resultPrefix??"今晚就去"); el.label.textContent=item.label; el.detail.textContent=item.detail; spinning=false; el.button.disabled=false; el.button.textContent=String(config.spinButtonText??"再转一次");
  }
  function polar(cx,cy,r,angle){const rad=angle*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}}
  function sectorPath(cx,cy,r,start,end){const a=polar(cx,cy,r,start),b=polar(cx,cy,r,end),large=end-start>180?1:0;return`M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y} Z`}
})();
