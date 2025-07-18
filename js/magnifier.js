function magnify(img, zoom = 20) {
  // Wait until the image is fully loaded
  if (!img.complete) {
    img.onload = () => magnify(img, zoom);
    return;
  }

  const glass = document.createElement("div");
  glass.className = "magnifier-glass";
  document.body.appendChild(glass);

  const glassSize = 300;
  let isActive = false; // Add state to control when magnification is active

  // Your original magnifying glass design
  Object.assign(glass.style, {
    position: "absolute",
    border: "3px solid #000",
    borderRadius: "50%",
    cursor: "none",
    width: `${glassSize}px`,
    height: `${glassSize}px`,
    backgroundRepeat: "no-repeat",
    backgroundImage: `url('${img.src}')`,
    backgroundSize: `${img.naturalWidth * zoom}px ${
      img.naturalHeight * zoom
    }px`,
    zIndex: 9999,
    display: "none",
    pointerEvents: "none",
  });

  // Your original moveMagnifier function - unchanged
  function moveMagnifier(e) {
    if (!isActive) return; // Only magnify when active

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const bgX = -x * scaleX * zoom + glassSize / 2;
    const bgY = -y * scaleY * zoom + glassSize / 2;

    glass.style.left = `${e.pageX - glassSize / 2}px`;
    glass.style.top = `${e.pageY - glassSize / 2}px`;
    glass.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }

  // Click to toggle magnification on/off
  img.addEventListener("click", () => {
    isActive = !isActive;

    if (isActive) {
      img.style.cursor = "zoom-out";
      // Show glass immediately if mouse is already over the image
      glass.style.display = "block";
    } else {
      glass.style.display = "none";
      img.style.cursor = "zoom-in";
    }
  });

  // Modified to only work when active
  img.addEventListener("mouseenter", () => {
    if (isActive) {
      glass.style.display = "block";
    }
  });

  img.addEventListener("mousemove", moveMagnifier);
  glass.addEventListener("mousemove", moveMagnifier);

  img.addEventListener("mouseleave", () => {
    glass.style.display = "none";
  });

  // Set initial cursor to show it's clickable
  img.style.cursor = "zoom-in";

  // Optional: return control object
  return {
    destroy() {
      glass.remove();
      img.style.cursor = "default";
    },

    activate() {
      isActive = true;
      img.style.cursor = "zoom-out";
    },

    deactivate() {
      isActive = false;
      glass.style.display = "none";
      img.style.cursor = "zoom-in";
    },
  };
}
