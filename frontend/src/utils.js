export function handleEnter(e, cb) {
  if (e.key === "Enter") {
    cb();
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
