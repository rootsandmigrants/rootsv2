document.addEventListener("DOMContentLoaded", function () {
  const tabs = {
    "animation-tab": "animation-content",
    "population-tab": "population-content",
    "migration-tab": "migration-content",
    "compare-tab": "compare-content",
    "immigration-tab": "immigration-content",
  };
  /**
   * Activates the specified tab and its associated content.
   * Deactivates all other tabs and contents.
   * Toggles the slider visibility based on the active tab.
   * @param {string} tabId - The ID of the tab to activate.
   */
  function activateTab(tabId) {
    const sliderContainer = document.getElementById("slider-container");
    const tablesContainer = document.getElementById("tables-container");
    // ✅ Hide the table completely if NOT in Compare tab
    if (tabId !== "compare-tab") {
      tablesContainer.style.display = "none";
      tablesContainer.style.opacity = "0";
      tablesContainer.style.pointerEvents = "none";
    } else {
      // ✅ Show the table ONLY in Compare tab
      tablesContainer.style.display = "flex";
      setTimeout(() => {
        // Small delay for smooth transition
        tablesContainer.style.opacity = "1";
        tablesContainer.style.pointerEvents = "auto";
      }, 100);
    }
    // Deactivate all tabs and content
    Object.keys(tabs).forEach((tab) => {
      const contentId = tabs[tab];
      const tabElement = document.getElementById(tab);
      const contentElement = document.getElementById(contentId);

      if (tabElement && contentElement) {
        tabElement.classList.remove("active");
        contentElement.classList.remove("show", "active");
      }
    });
    // Activate the selected tab
    const selectedTab = document.getElementById(tabId);
    const selectedContent = document.getElementById(tabs[tabId]);

    if (selectedTab && selectedContent) {
      selectedTab.classList.add("active");
      selectedContent.classList.add("show", "active");

      // Toggle slider visibility for specific tabs
      sliderContainer.style.display =
        tabId === "immigration-tab" || tabId === "compare-tab"
          ? "none"
          : "block";
    }
  }
  /**
   * Dynamically loads an external script if it hasn't been loaded yet.
   * @param {string} src - The source URL of the script to load.
   */
  function loadExternalScript(src) {
    const existingScript = Array.from(
      document.head.getElementsByTagName("script")
    ).find((script) => script.src.includes(src));

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => console.log(`${src} loaded successfully`);
      script.onerror = () => console.error(`Failed to load script: ${src}`);
      document.head.appendChild(script);
    } else {
      console.log(`Script ${src} already loaded.`);
    }
  }
  // Add event listeners to tabs for switching
  Object.keys(tabs).forEach((tabId) => {
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
      tabElement.addEventListener("click", () => {
        activateTab(tabId);

        // Load the corresponding external script if applicable
        switch (tabId) {
          case "animation-tab":
            loadExternalScript("js/history.js");
            break;
          case "population-tab":
            loadExternalScript("js/density.js");
            break;
          case "migration-tab":
            loadExternalScript("js/migration.js");
            break;
          case "compare-tab":
            loadExternalScript("js/compare.js");
            break;
          case "immigration-tab":
            loadExternalScript("js/immigration.js");
            break;
        }
      });
    }
  });
  // Default: Activate the Animation tab on page load
  activateTab("animation-tab");
});
// Make sure only one race can be checked at a time.
const checkboxes = document.querySelectorAll(".race-checkbox");
checkboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      checkboxes.forEach((cb) => {
        if (cb !== checkbox) {
          cb.checked = false;
        }
      });
    }
  });
});
