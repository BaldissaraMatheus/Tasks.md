export function handleKeyDown(e, enterCb, cancelCb) {
  e.stopPropagation();
  e.stopImmediatePropagation();
  if (e.key === "Enter") {
    enterCb(e);
  }
  if (e.key === "Escape" && cancelCb) {
    cancelCb(e);
  }
  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
    e.target.nextElementSibling?.focus();
  }
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
    e.target.previousElementSibling?.focus();
  }
}

export function getButtonCoordinates(event) {
  event.stopPropagation();
  const btnCoordinates = event.target.getBoundingClientRect();
  let x = btnCoordinates.x + event.target.offsetWidth - 3;
  const menuWidth = 82;
  const offsetX = x + menuWidth >= window.innerWidth ? menuWidth : 0;
  x -= offsetX;
  const offsetY = offsetX ? 0 : 3;
  const y = btnCoordinates.y + event.target.offsetHeight - offsetY;
  return { x, y };
}
