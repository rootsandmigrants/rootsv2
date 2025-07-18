document.addEventListener("DOMContentLoaded", function () {
  // Only initialize slider if we're on a page that has the slider element
  const slider = document.getElementById("slider");
  if (!slider) {
    return; // Exit if no slider found
  }

  // Check if welcome modal or video tutorial is open/active
  function isModalOpen() {
    const welcomeBlock = document.getElementById("Welcome-Block");
    const videoBlock = document.getElementById("VideoTutorial-Block");

    const welcomeOpen =
      welcomeBlock && !welcomeBlock.classList.contains("mfp-hide");
    const videoOpen = videoBlock && !videoBlock.classList.contains("mfp-hide");

    return welcomeOpen || videoOpen;
  }

  // Hide slider when any modal is open
  function checkModalState() {
    const sliderContainer = document.getElementById("slider-container");

    if (sliderContainer) {
      if (isModalOpen()) {
        sliderContainer.style.display = "none";
      } else {
        sliderContainer.style.display = "block";
      }
    }
  }

  // Monitor for modal changes
  const welcomeBlock = document.getElementById("Welcome-Block");
  const videoBlock = document.getElementById("VideoTutorial-Block");

  if (welcomeBlock || videoBlock) {
    // Initially hide slider if any modal is visible
    checkModalState();

    // Watch for class changes on both modals
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          checkModalState();
        }
      });
    });

    if (welcomeBlock) {
      observer.observe(welcomeBlock, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    if (videoBlock) {
      observer.observe(videoBlock, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    // Listen for all modal control buttons
    const getStartedBtn = document.getElementById("GetStarted-Btn");
    const skipBtn = document.getElementById("SkipTutorial-Btn");

    if (getStartedBtn) {
      getStartedBtn.addEventListener("click", () => {
        setTimeout(checkModalState, 100);
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        setTimeout(checkModalState, 100);
      });
    }

    // Also listen for any close buttons or overlay clicks that might close the video modal
    document.addEventListener("click", (e) => {
      // Check if clicking on modal overlay or close buttons
      if (
        e.target.classList.contains("mfp-close") ||
        e.target.classList.contains("mfp-bg") ||
        e.target.closest(".mfp-close")
      ) {
        setTimeout(checkModalState, 100);
      }
    });
  }

  const yearLabels = document.querySelector(".year-labels");
  const tickContainer = document.querySelector(".tick-container");
  const buttonContainer = document.querySelector(".button-container");

  // Zoom state
  let zoomLevel = 1; // 1 = full range, 2 = half range, 4 = quarter range
  const fullStart = 1607;
  const fullEnd = 1999;
  let currentStart = fullStart;
  let currentEnd = fullEnd;
  let currentYearIndicator = null;

  // Helper function to check if data is available for current tab
  function isDataAvailable(year) {
    const migrationTab = document.getElementById("migration-tab");
    const populationTab = document.getElementById("population-tab");

    const onMigrationTab =
      migrationTab && migrationTab.classList.contains("active");
    const onPopulationTab =
      populationTab && populationTab.classList.contains("active");

    // Check migration data availability
    if (onMigrationTab) {
      if (typeof migrationNamespace === "undefined") {
        return false; // Default to unavailable if namespace not loaded
      }
      if (!migrationNamespace.configsLoaded) {
        return false; // Default to unavailable if configs not loaded yet
      }
      return (
        migrationNamespace.shapefiles[year] && migrationNamespace.csvFiles[year]
      );
    }

    // Check density/population data availability
    if (onPopulationTab) {
      if (typeof densityNamespace === "undefined") {
        return false; // Default to unavailable if namespace not loaded
      }
      // Use the hasDataForYear method if it exists, otherwise check shapefiles directly
      if (typeof densityNamespace.hasDataForYear === "function") {
        return densityNamespace.hasDataForYear(year);
      }
      return densityNamespace.shapefiles && densityNamespace.shapefiles[year];
    }

    return true; // For animation tab or others, assume all years available
  }

  // Helper function to check if we're on a data-dependent tab
  function isOnDataDependentTab() {
    const migrationTab = document.getElementById("migration-tab");
    const populationTab = document.getElementById("population-tab");

    return (
      (migrationTab && migrationTab.classList.contains("active")) ||
      (populationTab && populationTab.classList.contains("active"))
    );
  }

  // Find nearest available year for current tab
  function findNearestAvailableYear(targetYear) {
    if (!isOnDataDependentTab()) {
      return targetYear; // If not on data-dependent tab, any year is fine
    }

    if (isDataAvailable(targetYear)) {
      return targetYear; // Year is available
    }

    // Search for nearest available year
    let searchRange = 1;
    const maxSearch = Math.max(
      targetYear - currentStart,
      currentEnd - targetYear
    );

    while (searchRange <= maxSearch) {
      // Check year before
      const yearBefore = targetYear - searchRange;
      if (yearBefore >= currentStart && isDataAvailable(yearBefore)) {
        return yearBefore;
      }

      // Check year after
      const yearAfter = targetYear + searchRange;
      if (yearAfter <= currentEnd && isDataAvailable(yearAfter)) {
        return yearAfter;
      }

      searchRange++;
    }

    return targetYear; // Fallback to original year if no available year found
  }

  // Generate clean ticks for slider
  function generateTicks() {
    if (!tickContainer) {
      console.warn("tickContainer not found");
      return;
    }

    tickContainer.innerHTML = ""; // Clear existing

    const containerWidth = slider.offsetWidth;

    // If container width is 0, retry in a moment
    if (containerWidth === 0) {
      setTimeout(generateTicks, 50);
      return;
    }

    const range = currentEnd - currentStart;

    // Determine tick interval based on zoom level
    let majorInterval, minorInterval;
    if (range <= 30) {
      majorInterval = 5;
      minorInterval = 1;
    } else if (range <= 60) {
      majorInterval = 10;
      minorInterval = 5;
    } else if (range <= 120) {
      majorInterval = 20;
      minorInterval = 10;
    } else {
      majorInterval = 50;
      minorInterval = 10;
    }

    // Create a set of all years we need to show
    const allYears = new Set();

    // Add all minor interval years
    for (let year = currentStart; year <= currentEnd; year += minorInterval) {
      allYears.add(year);
    }

    // Add all major interval years that fall within the range
    const firstMajor = Math.ceil(currentStart / majorInterval) * majorInterval;
    for (let year = firstMajor; year <= currentEnd; year += majorInterval) {
      allYears.add(year);
    }

    // Convert to sorted array
    const yearsToShow = Array.from(allYears).sort((a, b) => a - b);

    // Generate ticks for all years
    yearsToShow.forEach((year) => {
      // Check if this year is a major tick
      const isMajor = year % majorInterval === 0;

      // Check data availability for current tab
      const dataAvailable = isDataAvailable(year);
      const onDataDependentTab = isOnDataDependentTab();

      // Create tick wrapper
      const wrapper = document.createElement("div");
      wrapper.className = "tick-wrapper";

      // Calculate position accounting for CSS padding (6px on each side)
      const percentage = (year - currentStart) / range;
      const tickContainerPadding = 6; // From CSS: padding: 0 6px
      const effectiveWidth = containerWidth - tickContainerPadding * 2;
      const position = tickContainerPadding + percentage * effectiveWidth;
      wrapper.style.left = `${position}px`;

      // Create tick mark
      const tick = document.createElement("div");
      tick.className = isMajor ? "tick major" : "tick minor";

      // Add unavailable class if on data-dependent tab and no data
      if (onDataDependentTab && !dataAvailable) {
        tick.classList.add("unavailable");
      }

      // Add click event to tick (only if data is available or not on data-dependent tab)
      if (!onDataDependentTab || dataAvailable) {
        tick.addEventListener("click", () => {
          slider.value = year;
          updateYear(year);
          slider.dispatchEvent(new Event("input"));
        });
        tick.style.cursor = "pointer";
      } else {
        tick.style.cursor = "not-allowed";
        const currentTab =
          document.querySelector(".tab-button.active")?.textContent ||
          "this tab";
        tick.title = `No data available for ${year} on ${currentTab.toLowerCase()}`;
      }

      wrapper.appendChild(tick);

      // Add label for major ticks
      if (isMajor) {
        const label = document.createElement("div");
        label.className = "year";
        label.textContent = year;

        // Grey out label if unavailable
        if (onDataDependentTab && !dataAvailable) {
          label.classList.add("unavailable");
        }

        wrapper.appendChild(label);
      }

      tickContainer.appendChild(wrapper);
    });
  }

  // Make generateTicks available globally for other namespaces to call
  window.generateTicks = generateTicks;

  // Create current year display and zoom controls
  function initializeSlider() {
    // Create current year display
    currentYearIndicator = document.createElement("div");
    currentYearIndicator.className = "current-year";
    currentYearIndicator.textContent = slider.value;

    const container = document.getElementById("slider-container");
    container.insertBefore(currentYearIndicator, slider);

    // Create zoom controls
    const zoomControls = document.createElement("div");
    zoomControls.className = "zoom-controls";
    zoomControls.innerHTML = `
      <button id="zoom-out" title="Zoom Out">−</button>
      <button id="zoom-in" title="Zoom In">+</button>
      <button id="zoom-reset" title="Reset Zoom">⌂</button>
    `;

    // Insert zoom controls before the button container
    container.insertBefore(zoomControls, buttonContainer);

    // Add zoom event listeners
    document.getElementById("zoom-in").addEventListener("click", zoomIn);
    document.getElementById("zoom-out").addEventListener("click", zoomOut);
    document.getElementById("zoom-reset").addEventListener("click", resetZoom);

    // Generate initial ticks and labels
    generateTicks();
    updateBottomLabels();

    // Add resize listener to regenerate ticks
    window.addEventListener("resize", () => {
      // Debounce resize events
      clearTimeout(window.resizeTickTimeout);
      window.resizeTickTimeout = setTimeout(generateTicks, 150);
    });
  }

  // Zoom functions
  function zoomIn() {
    if (zoomLevel >= 8) return; // Max zoom

    const currentYear = parseInt(slider.value);
    const rangeSize = Math.ceil((currentEnd - currentStart) / 2);

    // Center zoom around current year
    let newStart = Math.max(fullStart, currentYear - Math.floor(rangeSize / 2));
    let newEnd = Math.min(fullEnd, newStart + rangeSize);

    // Adjust if we hit boundaries
    if (newEnd === fullEnd) {
      newStart = Math.max(fullStart, fullEnd - rangeSize);
    }

    currentStart = newStart;
    currentEnd = newEnd;
    zoomLevel *= 2;

    updateSliderRange();
  }

  function zoomOut() {
    if (zoomLevel <= 1) return; // Min zoom

    const currentYear = parseInt(slider.value);
    const rangeSize = Math.min(
      fullEnd - fullStart,
      (currentEnd - currentStart) * 2
    );

    // Center zoom around current year
    let newStart = Math.max(fullStart, currentYear - Math.floor(rangeSize / 2));
    let newEnd = Math.min(fullEnd, newStart + rangeSize);

    // Adjust if we hit boundaries
    if (newEnd === fullEnd) {
      newStart = Math.max(fullStart, fullEnd - rangeSize);
    }
    if (newStart === fullStart) {
      newEnd = Math.min(fullEnd, fullStart + rangeSize);
    }

    currentStart = newStart;
    currentEnd = newEnd;
    zoomLevel /= 2;

    updateSliderRange();
  }

  function resetZoom() {
    currentStart = fullStart;
    currentEnd = fullEnd;
    zoomLevel = 1;
    updateSliderRange();
  }

  function updateSliderRange() {
    const currentYear = parseInt(slider.value);

    slider.min = currentStart;
    slider.max = currentEnd;

    // Keep current year in range
    if (currentYear < currentStart) {
      slider.value = currentStart;
    } else if (currentYear > currentEnd) {
      slider.value = currentEnd;
    }

    updateYear(parseInt(slider.value));
    generateTicks(); // Generate ticks for new range
    updateBottomLabels(); // Update start/end labels

    // Trigger map update
    slider.dispatchEvent(new Event("input"));
  }

  // Update bottom labels (start/end years)
  function updateBottomLabels() {
    if (yearLabels) {
      yearLabels.innerHTML = `
        <span>${currentStart}</span>
        <span>${currentEnd}</span>
      `;
    }
  }

  // Update year display
  function updateYear(year) {
    if (currentYearIndicator) {
      currentYearIndicator.textContent = year;
    }
  }

  // Dedicated function for updating just the maps (used during animation)
  function updateMapsOnly(year) {
    const decade = Math.floor(year / 10) * 10;
    console.log(`Animation: ${year}, Loading decade: ${decade}`);

    // Update base maps directly without triggering other listeners
    if (typeof animNamespace !== "undefined")
      animNamespace.loadShapefile(decade);
    if (typeof densityNamespace !== "undefined")
      densityNamespace.loadMapData(decade);
    if (typeof migrationNamespace !== "undefined")
      migrationNamespace.loadShapefile(decade);

    // Handle race overlay for Black and White races (which have sufficient data)
    if (
      typeof raceOverlayNamespace !== "undefined" &&
      raceOverlayNamespace.loadedSubsets &&
      raceOverlayNamespace.loadedSubsets.size > 0
    ) {
      // Only update race data if it's Black or White (sufficient data races)
      raceOverlayNamespace.loadedSubsets.forEach((subset) => {
        if (subset === "Percent-Black" || subset === "Percent-White") {
          console.log(
            `Animation: Loading race data for ${subset} in ${decade}`
          );
          raceOverlayNamespace.loadRaceData(decade, subset);
        }
      });
    }
  }

  // Enhanced slider input event
  slider.addEventListener("input", (e) => {
    const requestedYear = parseInt(e.target.value);
    const actualYear = findNearestAvailableYear(requestedYear);

    // If we had to adjust the year, update the slider
    if (actualYear !== requestedYear) {
      slider.value = actualYear;
    }

    updateYear(actualYear);

    // Get the decade and update maps
    const decade = Math.floor(actualYear / 10) * 10;
    console.log(`Slider changed: ${actualYear}, Loading decade: ${decade}`);

    // Update maps
    if (typeof animNamespace !== "undefined")
      animNamespace.loadShapefile(decade);
    if (typeof densityNamespace !== "undefined")
      densityNamespace.loadMapData(decade);
    if (typeof migrationNamespace !== "undefined")
      migrationNamespace.loadShapefile(decade);

    // Handle race overlay - only update if there are active race layers
    if (
      typeof raceOverlayNamespace !== "undefined" &&
      raceOverlayNamespace.loadedSubsets &&
      raceOverlayNamespace.loadedSubsets.size > 0
    ) {
      // Update each loaded subset
      raceOverlayNamespace.loadedSubsets.forEach((subset) => {
        raceOverlayNamespace.loadRaceData(decade, subset);
      });
    }
  });

  // Play/Pause functionality
  const toggleButton = document.getElementById("toggle-button");
  const toggleIcon = document.getElementById("toggle-icon");
  let isPlaying = false;
  let intervalId;

  // Function to create and show custom noplay tooltip
  function showNoPlayTooltip(isRaceSelected = false) {
    // Remove any existing noplay tooltip
    const existingTooltip = document.getElementById("noplay");
    if (existingTooltip) {
      existingTooltip.remove();
    }

    // Create the noplay tooltip
    const tooltip = document.createElement("div");
    tooltip.id = "noplay";
    tooltip.className = "noplay-tooltip";

    // Different message for race selections vs other overlays
    tooltip.textContent = isRaceSelected
      ? "Few data available to view animation, explore interactively"
      : "Close stories and overlays to play animation dynamically";

    // Style the tooltip
    tooltip.style.cssText = `
      position: absolute;
      background-color: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    `;

    document.body.appendChild(tooltip);

    // Position tooltip above the button
    const buttonRect = toggleButton.getBoundingClientRect();
    tooltip.style.left = `${
      buttonRect.left + buttonRect.width / 2 - tooltip.offsetWidth / 2
    }px`;
    tooltip.style.top = `${buttonRect.top - tooltip.offsetHeight - 8}px`;

    // Show tooltip with fade in
    setTimeout(() => {
      tooltip.style.opacity = "1";
    }, 10);

    return tooltip;
  }

  // Function to hide noplay tooltip
  function hideNoPlayTooltip() {
    const tooltip = document.getElementById("noplay");
    if (tooltip) {
      tooltip.style.opacity = "0";
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 200);
    }
  }

  // Function to check if ANY popups, overlays, or limited-data race selections are active
  function hasActiveOverlaysOrPopups() {
    // Check for story popups and modals
    const storyPopups = document.querySelectorAll(".story-pop-up");
    const modalEvents = document.querySelectorAll(".modal-event");

    // Check if any story-pop-up is visible
    for (const popup of storyPopups) {
      if (
        popup.style.display === "block" ||
        (popup.style.display !== "none" && popup.offsetParent !== null)
      ) {
        console.log("Detected visible story popup - animation disabled");
        return true;
      }
    }

    // Check if any modal-event is visible
    for (const modal of modalEvents) {
      if (
        modal.style.display === "flex" ||
        modal.style.display === "block" ||
        (modal.style.display !== "none" && modal.offsetParent !== null)
      ) {
        console.log("Detected visible modal event - animation disabled");
        return true;
      }
    }

    // Check for race selections with LIMITED data (disable animation for these)
    const limitedDataRaces = [
      "Percent-Hispanic",
      "Percent-Asian",
      "Percent-AI",
    ];

    for (const raceId of limitedDataRaces) {
      const raceRadio = document.getElementById(raceId);
      if (raceRadio && raceRadio.checked) {
        console.log(
          `Detected limited-data race selection: ${raceId} - animation disabled`
        );
        return "race"; // Return special indicator for limited race data
      }
    }

    // Note: Percent-Black and Percent-White are NOT checked here - they allow animation

    // Check for active overlay checkboxes (transportation, territorial, etc.)
    const overlayCheckboxes = [
      "railroads",
      "erie-canal",
      "louisiana-purchase",
      "mexican-cession",
      "texas-annexation",
      "oregon-territory",
      "gadsden-purchase",
      "alaska-purchase",
      "florida-cession",
      "california-trail",
      "oregon-trail",
      "santa-fe-trail",
      "toggleNativeTerritories",
    ];

    for (const checkboxId of overlayCheckboxes) {
      const checkbox = document.getElementById(checkboxId);
      if (checkbox && checkbox.checked) {
        console.log(
          `Detected active overlay: ${checkboxId} - animation disabled`
        );
        return true;
      }
    }

    // Check if any legend containers have content (indicates active overlays)
    const legendContainers = [
      "overlay-legend-container",
      "overlay-legend-container-history",
    ];

    for (const containerId of legendContainers) {
      const container = document.getElementById(containerId);
      if (
        container &&
        container.children.length > 0 &&
        container.style.visibility !== "hidden"
      ) {
        console.log(
          `Detected active legend: ${containerId} - animation disabled`
        );
        return true;
      }
    }

    return false;
  }

  if (toggleButton && toggleIcon) {
    toggleButton.addEventListener("click", () => {
      // Check if animation is disabled
      if (toggleButton.classList.contains("disabled")) {
        console.log("Animation disabled - showing noplay tooltip");

        // Check if it's disabled due to race selection
        const overlayStatus = hasActiveOverlaysOrPopups();
        const isRaceSelected = overlayStatus === "race";

        // Show the custom tooltip briefly when clicking disabled button
        showNoPlayTooltip(isRaceSelected);
        setTimeout(hideNoPlayTooltip, 2000); // Hide after 2 seconds
        return;
      }

      if (isPlaying) {
        pauseAnimation();
      } else {
        playAnimation();
      }
    });
  }

  // Monitor Historical Narrative checkbox
  const narrativeCheckbox = document.getElementById("toggleNarrative");
  if (narrativeCheckbox) {
    // Function to update animation button state
    function updateAnimationButtonState() {
      const checkboxChecked = narrativeCheckbox.checked;
      const overlayStatus = hasActiveOverlaysOrPopups();
      const isRaceSelected = overlayStatus === "race";
      const hasActiveOverlays = overlayStatus === true || isRaceSelected;

      if (checkboxChecked || hasActiveOverlays) {
        // Disable animation when narrative is on OR any overlays/race selections are active
        toggleButton.classList.add("disabled");

        // Enhanced visual styling for disabled state
        toggleButton.style.opacity = "0.3";
        toggleButton.style.cursor = "not-allowed";
        toggleButton.style.pointerEvents = "auto"; // Allow hover for tooltip

        // Add hover events for custom noplay tooltip with appropriate message
        toggleButton.removeEventListener(
          "mouseenter",
          toggleButton._showTooltip
        );
        toggleButton.removeEventListener("mouseleave", hideNoPlayTooltip);

        toggleButton._showTooltip = () => showNoPlayTooltip(isRaceSelected);
        toggleButton.addEventListener("mouseenter", toggleButton._showTooltip);
        toggleButton.addEventListener("mouseleave", hideNoPlayTooltip);

        // Stop any currently playing animation
        if (isPlaying) {
          console.log(
            isRaceSelected
              ? "Stopping animation due to race selection"
              : "Stopping animation due to active overlays/popups/narrative"
          );
          pauseAnimation();
        }

        console.log(
          isRaceSelected
            ? "Animation button disabled - race selection active"
            : "Animation button disabled - overlays, popups, or narrative active"
        );
      } else {
        // Re-enable animation when narrative is off AND no overlays/race selections
        toggleButton.classList.remove("disabled");

        // Restore normal visual state
        toggleButton.style.opacity = "1";
        toggleButton.style.cursor = "pointer";
        toggleButton.style.pointerEvents = "auto";

        // Remove hover events for noplay tooltip
        if (toggleButton._showTooltip) {
          toggleButton.removeEventListener(
            "mouseenter",
            toggleButton._showTooltip
          );
          toggleButton.removeEventListener("mouseleave", hideNoPlayTooltip);
        }
        hideNoPlayTooltip(); // Hide any existing tooltip

        console.log(
          "Animation button enabled - no overlays, race selections, or narrative activity"
        );
      }
    }

    // Enhanced cleanup when unchecking narrative
    function cleanupNarrative() {
      console.log(
        "Cleaning up narrative - closing popups, clearing maps, and resetting"
      );

      // Close all story popups
      const storyPopups = document.querySelectorAll(".story-pop-up");
      const modalEvents = document.querySelectorAll(".modal-event");

      storyPopups.forEach((popup) => {
        popup.style.display = "none";
        popup.innerHTML = ""; // Clear content
      });

      modalEvents.forEach((modal) => {
        modal.style.display = "none";
        const content = modal.querySelector(".modals-content");
        if (content) content.innerHTML = ""; // Clear modal content
      });

      // Clear ALL narrative and overlay map layers
      console.log("Clearing all narrative and overlay map layers...");

      // Clear cession and trail layers (territorial acquisitions, etc.)
      if (
        typeof cessionNamespace !== "undefined" &&
        cessionNamespace.removeAllLayers
      ) {
        cessionNamespace.removeAllLayers();
        console.log("Cession and trail layers cleared");
      }

      // Clear railroad and Erie Canal layers
      if (
        typeof railroadsNamespace !== "undefined" &&
        railroadsNamespace.removeAllLayers
      ) {
        railroadsNamespace.removeAllLayers();
        console.log("Railroad and Erie Canal layers cleared");
      }

      // Alternative clearing function if it exists
      if (typeof clearTrailAndRailLayers === "function") {
        clearTrailAndRailLayers();
        console.log(
          "Trail and rail layers cleared via clearTrailAndRailLayers"
        );
      }

      // Clear any territorial/cession layers by year (going to early year with no overlays)
      if (typeof updateLayersByYear === "function") {
        updateLayersByYear(1600); // Year before any territorial changes
        console.log("Territorial layers cleared via updateLayersByYear");
      }

      // Reset Native Territories toggle if it's on
      const nativeTerritoriesCheckbox = document.getElementById(
        "toggleNativeTerritories"
      );
      if (nativeTerritoriesCheckbox && nativeTerritoriesCheckbox.checked) {
        nativeTerritoriesCheckbox.checked = false;
        nativeTerritoriesCheckbox.dispatchEvent(new Event("change"));
        console.log("Native Territories toggle reset");
      }

      // Reset all overlay checkboxes to unchecked state
      const overlayCheckboxes = [
        "railroads",
        "erie-canal",
        "louisiana-purchase",
        "mexican-cession",
        "texas-annexation",
        "oregon-territory",
        "gadsden-purchase",
        "alaska-purchase",
        "florida-cession",
        "california-trail",
        "oregon-trail",
        "santa-fe-trail",
      ];

      overlayCheckboxes.forEach((checkboxId) => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox && checkbox.checked) {
          checkbox.checked = false;
          console.log(`Reset checkbox: ${checkboxId}`);
        }
      });

      // Clear any overlay legends
      const legendContainers = [
        "overlay-legend-container",
        "overlay-legend-container-history",
      ];

      legendContainers.forEach((containerId) => {
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = "";
          container.style.visibility = "hidden";
          console.log(`Cleared legend container: ${containerId}`);
        }
      });

      // Reset slider to appropriate starting year for current tab
      const animationTab = document.getElementById("animation-tab");
      const isHistoryTab =
        animationTab && animationTab.classList.contains("active");
      const resetYear = isHistoryTab ? 1780 : 1790;

      console.log(
        `Resetting slider to ${resetYear} for ${
          isHistoryTab ? "History" : "non-History"
        } tab`
      );
      slider.value = resetYear;
      updateYear(resetYear);

      // Update only the basic maps (no narrative layers)
      console.log("Loading clean map state...");
      updateMapsOnly(resetYear);

      // Ensure we're in clean animation mode (no special overlays)
      if (typeof resetToAnimationMode === "function") {
        resetToAnimationMode();
        console.log("Reset to clean animation mode");
      }

      console.log("Narrative cleanup complete - maps and popups cleared");
    }

    // Listen for checkbox changes
    narrativeCheckbox.addEventListener("change", function () {
      if (!this.checked) {
        // When unchecking, clean up everything
        cleanupNarrative();
      }
      // Always update button state
      updateAnimationButtonState();
    });

    // Check for overlays/popups periodically (lightweight check)
    setInterval(() => {
      // Only update if button state would change
      const shouldBeDisabled =
        narrativeCheckbox.checked || hasActiveOverlaysOrPopups();
      const isCurrentlyDisabled = toggleButton.classList.contains("disabled");

      if (shouldBeDisabled !== isCurrentlyDisabled) {
        updateAnimationButtonState();
      }
    }, 1000); // Check every second

    // Check initial state
    updateAnimationButtonState();
  }

  function playAnimation() {
    // Extra safeguard: Check if narrative is active OR any overlays/limited-data race selections are active
    const narrativeCheckbox = document.getElementById("toggleNarrative");
    if (
      (narrativeCheckbox && narrativeCheckbox.checked) ||
      hasActiveOverlaysOrPopups()
    ) {
      console.log(
        "Cannot start animation - Historical Narrative, overlays, limited-data race selections, or popups are active"
      );
      return;
    }

    isPlaying = true;
    if (toggleIcon) {
      toggleIcon.classList.remove("bi-play-fill");
      toggleIcon.classList.add("bi-pause-fill");
    }

    // Hide colony event markers during animation
    if (typeof ColonyPopup !== "undefined") {
      ColonyPopup.hideEventMarkers();
    }

    // Determine starting year based on current tab and slider position
    const currentSliderYear = parseInt(slider.value);
    const animationTab = document.getElementById("animation-tab");
    const isHistoryTab =
      animationTab && animationTab.classList.contains("active");

    let startYear;

    console.log(
      `Animation starting - Current slider year: ${currentSliderYear}`
    );
    console.log(`Current tab is History: ${isHistoryTab}`);

    // Define minimum starting years for each tab type
    const minHistoryYear = 1780;
    const minOtherYear = 1790;

    // Check if we have a race overlay with sufficient data (Black or White)
    const checkedRaceRadio = document.querySelector(
      'input[name="population-layer"]:checked'
    );
    const hasRaceWithSufficientData =
      checkedRaceRadio &&
      (checkedRaceRadio.id === "Percent-Black" ||
        checkedRaceRadio.id === "Percent-White") &&
      typeof raceOverlayNamespace !== "undefined";

    let availableYears = [];
    let activeRaceSubset = null;

    if (hasRaceWithSufficientData) {
      activeRaceSubset = checkedRaceRadio.id;
      console.log(`🎨 Detected race with sufficient data: ${activeRaceSubset}`);

      // Get all available years for race data
      const allRaceYears = new Set();

      if (raceOverlayNamespace.dataFiles) {
        // Get all decades that have data files
        Object.keys(raceOverlayNamespace.dataFiles).forEach((decade) => {
          const decadeNum = parseInt(decade);
          // Only include years that have data for the active race subset
          if (decadeNum >= currentStart && decadeNum <= currentEnd) {
            allRaceYears.add(decadeNum);
          }
        });
      }

      // Convert to sorted array
      availableYears = Array.from(allRaceYears).sort((a, b) => a - b);

      console.log(`🎨 Race data available years:`, availableYears);

      if (availableYears.length === 0) {
        console.log("No race data available in current time range");
        pauseAnimation();
        return;
      }

      // Find starting year from available race years
      let startIndex = availableYears.findIndex(
        (year) => year >= currentSliderYear
      );
      if (startIndex === -1) {
        startIndex = 0; // Start from first available year
      }

      startYear = availableYears[startIndex];
      console.log(`🎨 Starting race animation from year: ${startYear}`);
    } else {
      // Normal animation logic for non-race overlays or population density
      if (isHistoryTab) {
        if (
          currentSliderYear >= minHistoryYear &&
          isDataAvailable(currentSliderYear)
        ) {
          startYear = currentSliderYear;
          console.log(
            `✅ Continuing History animation from current year: ${startYear}`
          );
        } else {
          startYear = minHistoryYear;
          console.log(
            `📍 History tab: Starting from minimum year ${minHistoryYear} (current: ${currentSliderYear})`
          );
        }
      } else {
        if (
          currentSliderYear >= minOtherYear &&
          isDataAvailable(currentSliderYear)
        ) {
          startYear = currentSliderYear;
          console.log(
            `✅ Continuing animation from current year: ${startYear}`
          );
        } else {
          startYear = minOtherYear;
          console.log(
            `📍 Non-History tab: Starting from minimum year ${minOtherYear} (current: ${currentSliderYear})`
          );
        }
      }
    }

    // Find the nearest available year to our chosen start year
    const availableStartYear = hasRaceWithSufficientData
      ? startYear
      : findNearestAvailableYear(startYear);
    console.log(`Final starting year: ${availableStartYear}`);

    // Set initial year
    slider.value = availableStartYear;
    updateYear(availableStartYear);
    updateMapsOnly(availableStartYear);

    // Set up animation progression
    let currentIndex = 0;
    let currentAnimationYear = availableStartYear;

    if (hasRaceWithSufficientData) {
      // Race animation: jump through only available years
      currentIndex = availableYears.indexOf(availableStartYear);

      // Ensure initial race data is loaded
      if (typeof raceOverlayNamespace !== "undefined") {
        console.log(
          `🎨 Loading initial race data: ${activeRaceSubset} for ${availableStartYear}`
        );
        raceOverlayNamespace.loadRaceData(availableStartYear, activeRaceSubset);
      }

      intervalId = setInterval(() => {
        // Check if any overlays or popups appeared during animation
        if (hasActiveOverlaysOrPopups()) {
          console.log(
            "Overlays or popups detected during animation - stopping"
          );
          pauseAnimation();
          return;
        }

        currentIndex++;

        if (currentIndex >= availableYears.length) {
          // Reset to beginning of available years
          currentIndex = 0;
          console.log(`🎨 Race animation completed cycle, restarting`);
        }

        currentAnimationYear = availableYears[currentIndex];
        console.log(
          `🎨 Race animation: ${currentAnimationYear} for ${activeRaceSubset}`
        );

        slider.value = currentAnimationYear;
        updateYear(currentAnimationYear);

        // Load race data specifically for this year/subset
        if (typeof raceOverlayNamespace !== "undefined") {
          raceOverlayNamespace.loadRaceData(
            currentAnimationYear,
            activeRaceSubset
          );
        }

        // Also update other maps
        updateMapsOnly(currentAnimationYear);
      }, 2000); // Longer interval for race data (2 seconds)
    } else {
      // Standard decade progression animation
      currentAnimationYear = availableStartYear - 10;

      intervalId = setInterval(() => {
        // Check if any overlays or popups appeared during animation
        if (hasActiveOverlaysOrPopups()) {
          console.log(
            "Overlays, race selections, or popups detected during animation - stopping"
          );
          pauseAnimation();
          return;
        }

        currentAnimationYear += 10; // Increment by 10 years (decades)

        if (currentAnimationYear > currentEnd) {
          // When reaching the end, reset to appropriate start year for current tab
          const resetYear = isHistoryTab ? minHistoryYear : minOtherYear;
          currentAnimationYear = resetYear;
          console.log(
            `Animation reached end, resetting to ${resetYear} for current tab`
          );
        }

        // Find nearest available year for animation
        const availableYear = findNearestAvailableYear(currentAnimationYear);
        slider.value = availableYear;
        updateYear(availableYear);
        updateMapsOnly(availableYear);
      }, 1500); // 1.5 seconds per decade
    }
  }

  function pauseAnimation() {
    isPlaying = false;
    if (toggleIcon) {
      toggleIcon.classList.remove("bi-pause-fill");
      toggleIcon.classList.add("bi-play-fill");
    }
    clearInterval(intervalId);

    // Show colony event markers when animation pauses
    if (typeof ColonyPopup !== "undefined") {
      ColonyPopup.showEventMarkers();
    }
  }

  // Enhanced tab switching with animation stop and tick regeneration
  const tabs = ["animation-tab", "population-tab", "migration-tab"];
  tabs.forEach((tabId) => {
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.addEventListener("click", () => {
        // Always stop animation when switching tabs
        if (isPlaying) {
          console.log(`Stopping animation due to tab switch to: ${tabId}`);
          pauseAnimation();
        }
        // Regenerate ticks after a short delay to ensure tab switching is complete
        setTimeout(() => {
          generateTicks();
        }, 100);
      });
    }
  });

  // Also listen for any other tab switching mechanisms (like tab buttons with different classes)
  document.addEventListener("click", (e) => {
    // Check if clicked element is a tab button
    if (
      e.target.classList.contains("tab-button") ||
      e.target.closest(".tab-button") ||
      e.target.classList.contains("tab") ||
      e.target.closest(".tab")
    ) {
      // Stop animation when switching tabs
      if (isPlaying) {
        console.log("Stopping animation due to tab button click");
        pauseAnimation();
      }
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return; // Don't interfere with input fields

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        const leftYear = findNearestAvailableYear(
          Math.max(currentStart, parseInt(slider.value) - 1)
        );
        slider.value = leftYear;
        updateYear(leftYear);
        slider.dispatchEvent(new Event("input"));
        break;
      case "ArrowRight":
        e.preventDefault();
        const rightYear = findNearestAvailableYear(
          Math.min(currentEnd, parseInt(slider.value) + 1)
        );
        slider.value = rightYear;
        updateYear(rightYear);
        slider.dispatchEvent(new Event("input"));
        break;
      case " ":
        e.preventDefault();
        if (toggleButton) toggleButton.click();
        break;
      case "=":
      case "+":
        e.preventDefault();
        zoomIn();
        break;
      case "-":
        e.preventDefault();
        zoomOut();
        break;
      case "0":
        e.preventDefault();
        resetZoom();
        break;
    }
  });

  // Mouse wheel zoom on slider
  slider.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  });

  // Initialize
  initializeSlider();
  updateYear(parseInt(slider.value));

  // Listen for migration configurations loading
  document.addEventListener("migrationConfigsLoaded", () => {
    console.log("Migration configs loaded, regenerating slider ticks");
    generateTicks();
  });

  // Listen for density configurations loading (if needed)
  document.addEventListener("densityConfigsLoaded", () => {
    console.log("Density configs loaded, regenerating slider ticks");
    generateTicks();
  });

  // Also regenerate ticks when migration namespace is fully loaded
  // Check periodically if migration namespace is loaded and regenerate once
  let migrationCheckInterval;
  if (typeof migrationNamespace !== "undefined") {
    migrationCheckInterval = setInterval(() => {
      if (migrationNamespace.configsLoaded) {
        console.log(
          "Migration namespace fully loaded, regenerating slider ticks"
        );
        generateTicks();
        clearInterval(migrationCheckInterval);
      }
    }, 100);

    // Clear interval after 10 seconds to avoid infinite checking
    setTimeout(() => {
      if (migrationCheckInterval) {
        clearInterval(migrationCheckInterval);
      }
    }, 10000);
  }
});
