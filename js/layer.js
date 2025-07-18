// ============================================================================
// THIS FILE CONTROLS THE HOVER FUNCTIONALITY FOR OVERLAY CONTROL
// ============================================================================
let isHoveringIcon = false,
  isHoveringPanel = false;
// Show the control panel when hovering over the icon
document
  .getElementById("layer-icon-population")
  .addEventListener("mouseover", function () {
    const controlDiv = document.getElementById("layer-control-population");
    controlDiv.style.display = "block";
  });

// Hide the control panel when moving the mouse away from the icon
document
  .getElementById("layer-icon-population")
  .addEventListener("mouseout", function () {
    const controlDiv = document.getElementById("layer-control-population");
    controlDiv.style.display = "none";
  });

// Keep the control panel visible if hovering over it
document
  .getElementById("layer-control-population")
  .addEventListener("mouseover", function () {
    this.style.display = "block";
  });

// Hide the control panel when the mouse leaves it
document
  .getElementById("layer-control-population")
  .addEventListener("mouseout", function () {
    this.style.display = "none";
  });

document
  .getElementById("layer-icon-animation")
  .addEventListener("mouseover", () => {
    isHoveringIcon = true;
    document.getElementById("layer-control-animation").style.display = "block";
  });

document
  .getElementById("layer-icon-animation")
  .addEventListener("mouseout", () => {
    isHoveringIcon = false;
    setTimeout(hideLayerControl, 300);
  });

document
  .getElementById("layer-control-animation")
  .addEventListener("mouseover", () => {
    isHoveringPanel = true;
    document.getElementById("layer-control-animation").style.display = "block";
  });

document
  .getElementById("layer-control-animation")
  .addEventListener("mouseout", () => {
    isHoveringPanel = false;
    setTimeout(hideLayerControl, 300);
  });

function hideLayerControl() {
  if (!isHoveringIcon && !isHoveringPanel)
    document.getElementById("layer-control-animation").style.display = "none";
}
