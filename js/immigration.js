document.addEventListener("DOMContentLoaded", () => {
  class ImmigrationMap {
    constructor(containerId, sliderId, sliderTicksId, year = "1850") {
      this.containerId = containerId;
      this.sliderId = sliderId;
      this.sliderTicksId = sliderTicksId;
      this.currentYear = year;
      this.countryCoordinates = {};
      this.selectedStateFeature = null;
      this.selectedStateName = "All";
      this.enabledYears = [];
      this.historicalContext = {};

      // Chart-related properties
      this.chart = null;
      this.chartInitialized = false;

      // Add update prevention flags
      this.preventChartUpdate = false;
      this.preventMapUpdate = false;

      // Search dropdown properties
      this.availableStates = ["All"];
      this.selectedSearchIndex = -1;

      // Modal management properties
      this.activeModal = null;
      this.modalZIndex = 10000;
      this.handleEscapeKey = null;

      this.map = new maplibregl.Map({
        container: this.containerId,
        style: {
          version: 8,
          sources: {
            esriWorldPhysical: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              attribution:
                '<a href="https://www.esri.com/" target="_blank">Esri</a> | <a href="https://www.nhgis.org/" target="_blank">IPUMS NHGIS</a>',
            },
          },
          glyphs:
            "https://rootsandmigrants.github.io/fonts/glyphs/{fontstack}/{range}.pbf",

          layers: [
            {
              id: "esriWorldPhysical-layer",
              type: "raster",
              source: "esriWorldPhysical",
              minzoom: 0,
              maxzoom: 24,
              paint: { "raster-opacity": 0.2 },
            },
          ],
        },
        renderWorldCopies: false, // Prevents rendering multiple copies of the world

        center: [-98.35, 39.5],
        zoom: 3,
      });

      this.historicalContext = {};

      this.initializeControls();
      this.loadCountryCoordinates();
      this.loadHistoricalContext();
      this.generateSliderTicks();
      this.initializeMap();
      this.initializeChart();
      this.initializeButtons();
    }

    // Initialize all button click handlers
    initializeButtons() {
      // Initialize history button
      const historyBtn = document.getElementById("showHistoryBtn");
      if (historyBtn) {
        // Remove any existing click handlers
        historyBtn.onclick = null;

        // Add new click handler
        historyBtn.addEventListener("click", () => {
          console.log("History button clicked!");
          this.showHistoricalContext();
        });

        console.log("✅ History button click handler initialized");
      } else {
        console.warn("⚠️ History button #showHistoryBtn not found in DOM");
      }

      // Initialize chart collapse button
      const collapseBtn = document.getElementById("collapseChartBtn");
      if (collapseBtn) {
        // Remove any existing click handlers
        collapseBtn.onclick = null;

        // Add new click handler
        collapseBtn.addEventListener("click", () => {
          console.log("Chart collapse button clicked!");
          this.toggleChart();
        });

        console.log("✅ Chart collapse button click handler initialized");
      } else {
        console.warn(
          "⚠️ Chart collapse button #collapseChartBtn not found in DOM"
        );
      }
    }

    // Modal management methods
    closeActiveModal() {
      if (this.activeModal) {
        if (this.handleEscapeKey) {
          document.removeEventListener("keydown", this.handleEscapeKey);
          this.handleEscapeKey = null;
        }
        this.activeModal.remove();
        this.activeModal = null;
      }
    }

    isModalOpen() {
      return this.activeModal !== null;
    }

    // FIXED: Improved getHistoricalContext with better error handling and logging
    getHistoricalContext() {
      if (!this.currentYear) {
        return null;
      }

      // If no state is selected OR "All States Combined" is selected, show national/US-wide historical context
      if (
        !this.selectedStateFeature ||
        this.selectedStateName === "All" ||
        !this.selectedStateName
      ) {
        return this.getNationalHistoricalContext();
      }

      // Get immigration data for current state
      const immigrationData = this.extractChartImmigrationData(
        this.selectedStateFeature
      );

      // Debug: Log the countries found in the data
      console.log("Countries found in data:", Object.keys(immigrationData));
      console.log("Current year:", this.currentYear);

      // Sort countries by immigration numbers
      const sortedCountries = Object.entries(immigrationData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); // Top 5 countries

      console.log("Top 5 countries:", sortedCountries);

      // Find relevant historical stories with improved decade matching
      const stories = [];
      const currentYearInt = parseInt(this.currentYear);
      const decade = Math.floor(currentYearInt / 10) * 10;

      for (const [country, count] of sortedCountries) {
        const countryStories = this.historicalContext[country];

        console.log(
          `Checking stories for ${country}:`,
          countryStories ? Object.keys(countryStories) : "No stories available"
        );

        if (countryStories) {
          let story = null;
          let storyYear = null;

          // 1. Look for exact year first
          if (countryStories[this.currentYear]) {
            story = countryStories[this.currentYear];
            storyYear = this.currentYear;
            console.log(
              `Found exact year match for ${country}: ${this.currentYear}`
            );
          }

          // 2. Look for any events in the current decade (e.g., 1870-1879 for 1870s)
          if (!story) {
            Object.keys(countryStories).forEach((eventYear) => {
              const eventYearInt = parseInt(eventYear);
              const eventDecade = Math.floor(eventYearInt / 10) * 10;

              // If this event is in the same decade
              if (eventDecade === decade) {
                story = countryStories[eventYear];
                storyYear = eventYear;
                console.log(
                  `Found decade match for ${country}: ${eventYear} in ${decade}s`
                );
                return; // Exit the forEach early
              }
            });
          }

          if (story) {
            stories.push({
              country: country,
              count,
              percentage: Math.round(
                (count /
                  Object.values(immigrationData).reduce((a, b) => a + b, 0)) *
                  100
              ),
              eventYear: storyYear,
              ...story,
            });
            console.log(
              `✅ Added story for ${country} from ${storyYear}: ${story.title}`
            );
          } else {
            console.log(
              `❌ No story found for ${country} in decade ${decade}s or nearby years`
            );
          }
        } else {
          console.log(
            `❌ No historical context available for country: ${country}`
          );
        }
      }

      console.log(`Final result: Found ${stories.length} stories`);

      return {
        stateName:
          this.selectedStateFeature.properties.STATENAM ||
          this.selectedStateFeature.properties.LABEL,
        year: this.currentYear,
        totalImmigrants: Object.values(immigrationData).reduce(
          (a, b) => a + b,
          0
        ),
        topCountries: sortedCountries,
        stories,
        isNational: false,
      };
    }

    // FIXED: Improved getNationalHistoricalContext with better error handling
    getNationalHistoricalContext() {
      if (!this.currentYear) {
        return null;
      }

      const stories = [];
      const currentYearInt = parseInt(this.currentYear);
      const decade = Math.floor(currentYearInt / 10) * 10;

      // Helper function to find events in the current decade
      const findEventsInDecade = (events) => {
        const foundEvents = [];

        // First try exact year match
        if (events[this.currentYear]) {
          foundEvents.push({
            year: this.currentYear,
            event: events[this.currentYear],
          });
        }

        // Then look for any events in the current decade (e.g., 1870-1879 for 1870s)
        Object.keys(events).forEach((eventYear) => {
          const eventYearInt = parseInt(eventYear);
          const eventDecade = Math.floor(eventYearInt / 10) * 10;

          // If this event is in the same decade and we haven't already found it
          if (eventDecade === decade && eventYear !== this.currentYear) {
            foundEvents.push({ year: eventYear, event: events[eventYear] });
          }
        });

        return foundEvents;
      };

      // 1. Check for US-wide immigration events (major immigration waves, demographic changes)
      const usaEvents = this.historicalContext["USA"] || {};
      console.log(
        "Checking for USA immigration events:",
        Object.keys(usaEvents)
      );

      const usaEventsFound = findEventsInDecade(usaEvents);
      usaEventsFound.forEach(({ year, event }) => {
        stories.push({
          country: "United States",
          count: null,
          percentage: null,
          eventYear: year,
          category: "immigration",
          ...event,
        });
        console.log(
          `✅ Added USA immigration event from ${year}: ${event.title}`
        );
      });

      // 2. Check for national political/institutional events
      const nationalEvents = this.historicalContext["National"] || {};
      console.log(
        "Checking for national political events:",
        Object.keys(nationalEvents)
      );

      const nationalEventsFound = findEventsInDecade(nationalEvents);
      nationalEventsFound.forEach(({ year, event }) => {
        stories.push({
          country: "National Event",
          count: null,
          percentage: null,
          eventYear: year,
          category: "political",
          ...event,
        });
        console.log(
          `✅ Added national political event from ${year}: ${event.title}`
        );
      });

      // 3. Check for immigration policy/legal events
      const policyEvents =
        this.historicalContext["Policy"] ||
        this.historicalContext["Laws"] ||
        {};
      console.log(
        "Checking for policy/legal events:",
        Object.keys(policyEvents)
      );

      const policyEventsFound = findEventsInDecade(policyEvents);
      policyEventsFound.forEach(({ year, event }) => {
        stories.push({
          country: "Policy/Law",
          count: null,
          percentage: null,
          eventYear: year,
          category: "legal",
          ...event,
        });
        console.log(`✅ Added policy/legal event from ${year}: ${event.title}`);
      });

      console.log(
        `Final national result: Found ${stories.length} stories for decade ${decade}s`
      );

      return stories.length > 0
        ? {
            stateName: "United States",
            year: this.currentYear,
            totalImmigrants: null,
            topCountries: [],
            stories,
            isNational: true,
          }
        : null;
    }

    updateHistoryButtonState() {
      const historyBtn = document.getElementById("showHistoryBtn");
      if (!historyBtn) return;

      const context = this.getHistoricalContext();

      if (context && context.stories.length > 0) {
        historyBtn.disabled = false;
        historyBtn.style.opacity = "1";
        historyBtn.style.cursor = "pointer";

        if (context.isNational) {
          historyBtn.title = `View national historical context for ${context.stories.length} event(s) in ${context.year}`;
          historyBtn.textContent = `📚 National Context (${context.stories.length})`;
        } else {
          historyBtn.title = `View historical context for ${context.stories.length} immigration story(s)`;
          historyBtn.textContent = `📚 Historical Context (${context.stories.length})`;
        }
      } else if (this.selectedStateName && this.selectedStateName !== "All") {
        // Specific state selected but no stories available
        historyBtn.disabled = true;
        historyBtn.style.opacity = "0.6";
        historyBtn.style.cursor = "not-allowed";
        historyBtn.title =
          "No historical context available for this state/year combination";
        historyBtn.textContent = "📚 No Stories Available";
      } else {
        // No state selected or "All States Combined" - check for national events
        const nationalContext = this.getNationalHistoricalContext();
        if (nationalContext && nationalContext.stories.length > 0) {
          historyBtn.disabled = false;
          historyBtn.style.opacity = "1";
          historyBtn.style.cursor = "pointer";
          historyBtn.title = `View national historical context for ${nationalContext.stories.length} event(s) in ${this.currentYear}`;
          historyBtn.textContent = `📚 National Context (${nationalContext.stories.length})`;
        } else {
          historyBtn.disabled = true;
          historyBtn.style.opacity = "0.6";
          historyBtn.style.cursor = "not-allowed";
          historyBtn.title = `No national historical context available for ${this.currentYear}`;
          historyBtn.textContent = "📚 No National Events";
        }
      }
    }

    // FIXED: Improved showHistoricalContext with modal management
    showHistoricalContext() {
      console.log("showHistoricalContext triggered");

      const context = this.getHistoricalContext();
      if (!context || context.stories.length === 0) {
        alert("No historical context available for this selection.");
        return;
      }

      // Close any existing modal first
      this.closeActiveModal();

      // Create modal overlay
      const modal = document.createElement("div");
      modal.id = "historical-context-modal";
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: ${this.modalZIndex};
        padding: 20px;
        box-sizing: border-box;
      `;

      // Set as active modal
      this.activeModal = modal;

      // Create modal content
      const modalContent = document.createElement("div");
      modalContent.style.cssText = `
        background: white;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        position: relative;
        margin-top: -50px;
      `;

      // Generate modal HTML with inline multimedia
      let storiesHTML = "";
      context.stories.forEach((story) => {
        // Handle different event categories with different badge colors
        const countryBadge =
          story.count !== null
            ? `${story.country}: ${story.count.toLocaleString()} (${
                story.percentage
              }%)`
            : story.country;

        // Category-based badge colors
        let badgeColor = "#3498db"; // Default blue for state-specific
        if (context.isNational) {
          switch (story.category) {
            case "immigration":
              badgeColor = "#2ecc71";
              break; // Green for USA immigration events
            case "political":
              badgeColor = "#9b59b6";
              break; // Purple for National political events
            case "legal":
              badgeColor = "#e74c3c";
              break; // Red for Policy/Legal events
            default:
              badgeColor = "#34495e"; // Dark gray for other
          }
        }

        // Show the actual event year if different from current viewing year
        const eventYearDisplay =
          story.eventYear && story.eventYear !== context.year
            ? ` (${story.eventYear})`
            : "";

        // Generate inline multimedia content
        let multimediaHTML = "";

        // Handle video (single URL) - embed directly
        if (story.video) {
          multimediaHTML += `
            <div style="margin: 15px 0;">
              <iframe 
                width="100%" 
                height="315" 
                src="${story.video}" 
                frameborder="0" 
                allowfullscreen
                style="border-radius: 8px; max-width: 560px;">
              </iframe>
            </div>
          `;
        }

        // Handle images (array of URLs) - show directly
        if (story.images && Array.isArray(story.images)) {
          multimediaHTML += '<div style="margin: 15px 0;">';

          story.images.forEach((imageUrl, index) => {
            multimediaHTML += `
              <div style="margin: 10px 0;">
                <img 
                  src="${imageUrl}" 
                  alt="Historical image ${index + 1}"
                  style="
                    max-width: 100%; 
                    height: auto; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    cursor: zoom-in;
                  "
                  onclick="this.style.transform = this.style.transform ? '' : 'scale(1.5)'; this.style.transition = 'transform 0.3s ease';"
                />
              </div>
            `;
          });

          multimediaHTML += "</div>";
        }

        // Handle resources (array of objects with label and url) - keep as external links
        if (story.resources && Array.isArray(story.resources)) {
          multimediaHTML +=
            '<div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">';
          multimediaHTML +=
            '<h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 14px;">📚 Additional Resources:</h4>';

          story.resources.forEach((resource) => {
            multimediaHTML += `
              <a href="${resource.url}" target="_blank" style="
                display: inline-block;
                background: #2ecc71;
                color: white;
                padding: 6px 12px;
                text-decoration: none;
                border-radius: 4px;
                margin: 3px 5px 3px 0;
                font-size: 12px;
                font-weight: bold;
              ">
                🔗 ${resource.label}
              </a>
            `;
          });

          multimediaHTML += "</div>";
        }

        storiesHTML += `
          <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h3 style="margin: 0; color: #2c3e50; font-size: 18px;">${story.title}${eventYearDisplay}</h3>
              <span style="background: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                ${countryBadge}
              </span>
            </div>
            <p style="margin: 10px 0; line-height: 1.6; color: #34495e; font-size: 14px;">
              ${story.story}
            </p>
            ${multimediaHTML}
            <div style="background: #ecf0f1; padding: 10px; border-radius: 6px; margin-top: 10px;">
              <strong style="color: #27ae60; font-size: 13px;">Impact:</strong>
              <span style="color: #2c3e50; font-size: 13px;">${story.impact}</span>
            </div>
          </div>
        `;
      });

      // Update header text for national vs state events
      const headerTitle = context.isNational
        ? "National Immigration Events"
        : "Immigration Events";
      const headerSubtext = context.isNational
        ? `United States, ${context.year} • National Events`
        : `${context.stateName}, ${
            context.year
          } • ${context.totalImmigrants.toLocaleString()} total immigrants`;

      const closeModalHandler = () => {
        this.closeActiveModal();
      };

      modalContent.innerHTML = `
        <div style="padding: 25px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid ${
            context.isNational ? "#34495e" : "#3498db"
          };">
            <div>
              <h2 style="margin: 0; color: #2c3e50; font-size: 22px;">${headerTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">
                ${headerSubtext}
              </p>
              ${
                context.isNational
                  ? `
                <div style="margin-top: 8px; font-size: 12px;">
                  <span style="background: #2ecc71; color: white; padding: 2px 6px; border-radius: 8px; margin-right: 4px;">Immigration</span>
                  <span style="background: #9b59b6; color: white; padding: 2px 6px; border-radius: 8px; margin-right: 4px;">Political</span>
                  <span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 8px;">Legal</span>
                </div>
              `
                  : ""
              }
            </div>
            <button id="historical-close-btn" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #95a5a6;
              padding: 5px;
              border-radius: 50%;
              width: 35px;
              height: 35px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">×</button>
          </div>
          
          ${storiesHTML}
          
          <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ecf0f1;">
            <button id="historical-close-btn-bottom" style="
              background: ${context.isNational ? "#34495e" : "#3498db"};
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
            ">Close</button>
          </div>
        </div>
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Add event listeners after content is added
      document
        .getElementById("historical-close-btn")
        .addEventListener("click", closeModalHandler);
      document
        .getElementById("historical-close-btn-bottom")
        .addEventListener("click", closeModalHandler);

      // Close on overlay click
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModalHandler();
        }
      });

      // Escape key handler
      this.handleEscapeKey = (e) => {
        if (e.key === "Escape" && this.activeModal === modal) {
          closeModalHandler();
        }
      };
      document.addEventListener("keydown", this.handleEscapeKey);
    }

    // FIXED: Chart expansion with proper modal management
    showChartModal() {
      if (!this.chart) {
        console.warn("No chart available to expand");
        return;
      }

      // Close any existing modal first
      this.closeActiveModal();

      console.log("Opening chart modal...");

      // Save current chart data before destroying it
      const savedChartData = {
        labels: [...this.chart.data.labels],
        datasets: [
          {
            ...this.chart.data.datasets[0],
            data: [...this.chart.data.datasets[0].data],
          },
        ],
      };

      // Get current chart information
      const year = this.currentYear;
      const selectedState = this.selectedStateName || "All";
      const stateText = selectedState === "All" ? "All States" : selectedState;

      // Hide/destroy the original chart
      const originalCanvas = document.getElementById("immigrationChart");
      if (originalCanvas) {
        const ctx = originalCanvas.getContext("2d");
        ctx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
        originalCanvas.style.display = "none";
      }

      // Destroy the original chart instance
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      // Create modal with higher z-index
      const modal = document.createElement("div");
      modal.id = "chart-expansion-modal";
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: ${this.modalZIndex + 1};
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Set as active modal
      this.activeModal = modal;

      const modalContent = document.createElement("div");
      modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        width: 90vw;
        height: 90vh;
        max-width: 1200px;
        max-height: 800px;
        position: relative;
        overflow: auto;
      `;

      // Create close button
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "×";
      closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        z-index: 1;
      `;

      // Create canvas container
      const canvasContainer = document.createElement("div");
      canvasContainer.style.cssText = `
        position: relative;
        width: 100%;
        height: calc(100% - 80px);
        min-height: 500px;
      `;

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.id = "expandedChart";
      canvas.style.cssText = `
        width: 100%;
        height: 100%;
      `;

      // Assemble modal
      canvasContainer.appendChild(canvas);
      modalContent.appendChild(closeBtn);
      modalContent.appendChild(canvasContainer);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Close handlers that restore the original chart
      const closeModal = () => {
        this.closeActiveModal();
        // Restore the original chart
        this.restoreOriginalChart(savedChartData);
      };

      closeBtn.addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      // Escape key handler
      this.handleEscapeKey = (e) => {
        if (e.key === "Escape" && this.activeModal === modal) {
          closeModal();
        }
      };
      document.addEventListener("keydown", this.handleEscapeKey);

      // Create expanded chart
      setTimeout(() => {
        const ctx = canvas.getContext("2d");

        // Create chart with expanded options
        new Chart(ctx, {
          type: "bar",
          data: savedChartData,
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Immigration by Country - ${year} (${stateText})`,
                font: { size: 20, weight: "bold" },
                padding: 30,
              },
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const stateInfo =
                      selectedState === "All"
                        ? "across all states"
                        : `to ${selectedState}`;
                    return `${context.parsed.x.toLocaleString()} immigrants ${stateInfo}`;
                  },
                },
                titleFont: { size: 16 },
                bodyFont: { size: 14 },
                padding: 15,
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: "Number of Immigrants",
                  font: { size: 16, weight: "bold" },
                },
                ticks: {
                  callback: function (value) {
                    return value.toLocaleString();
                  },
                  font: { size: 14 },
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Country of Origin",
                  font: { size: 16, weight: "bold" },
                },
                ticks: {
                  font: { size: 14 },
                },
              },
            },
            layout: {
              padding: { top: 20, bottom: 20, left: 20, right: 20 },
            },
          },
        });

        console.log("Expanded chart created successfully");
      }, 100);
    }

    // NEW: Method to restore the original chart
    restoreOriginalChart(chartData) {
      const originalCanvas = document.getElementById("immigrationChart");
      if (!originalCanvas) {
        console.error("Original canvas not found!");
        return;
      }

      // Show the original canvas
      originalCanvas.style.display = "block";
      originalCanvas.style.width = "100%";
      originalCanvas.style.height = "400px";

      // Clear and recreate the chart
      const ctx = originalCanvas.getContext("2d");
      ctx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);

      // Get current settings for the chart
      const year = this.currentYear;
      const selectedState = this.selectedStateName || "All";
      const stateText = selectedState === "All" ? "All States" : selectedState;

      const topCountriesSelect = document.getElementById("topCountries");
      const topCountSelection = topCountriesSelect?.value || "all";
      const countText =
        topCountSelection === "all"
          ? "All Countries"
          : `Top ${topCountSelection}`;

      // Recreate the original chart
      this.chart = new Chart(ctx, {
        type: "bar",
        data: chartData,
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `Immigration by Country - ${year} (${stateText}) - ${countText}`,
              font: { size: 16, weight: "bold" },
            },
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const stateInfo =
                    selectedState === "All"
                      ? "across all states"
                      : `to ${selectedState}`;
                  return `${context.parsed.x.toLocaleString()} immigrants ${stateInfo}`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Number of Immigrants",
                font: { size: 12, weight: "bold" },
              },
              ticks: {
                callback: function (value) {
                  return value.toLocaleString();
                },
              },
            },
            y: {
              title: {
                display: true,
                text: "Country of Origin",
                font: { size: 12, weight: "bold" },
              },
            },
          },
          animation: { duration: 1000, easing: "easeInOutQuart" },
          layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } },
        },
      });

      // Resize chart after restoration
      setTimeout(() => {
        if (this.chart) {
          this.chart.resize();
        }
      }, 100);

      console.log("Original chart restored successfully");
    }

    // FIXED: Initialize chart with expand button handler
    initializeChart() {
      const chartContainer = document.getElementById("immi-chart");
      if (!chartContainer) {
        console.warn("Chart container #immi-chart not found");
        return;
      }

      chartContainer.style.display = "block";
      this.setupChartEventListeners();

      // CRITICAL: Set up expand button click handler
      const expandBtn = document.getElementById("expandChartBtn");
      if (expandBtn) {
        expandBtn.addEventListener("click", () => {
          console.log("Expand button clicked");
          this.showChartModal();
        });
        console.log("Expand button handler attached");
      } else {
        console.warn("Expand button #expandChartBtn not found");
      }

      console.log("Chart initialized");
    }

    toggleChart() {
      const chartContainer = document.getElementById("immi-chart");
      const collapseBtn = document.getElementById("collapseChartBtn");

      if (!chartContainer || !collapseBtn) return;

      if (chartContainer.classList.contains("collapsed")) {
        chartContainer.classList.remove("collapsed");
        chartContainer.classList.add("expanded");
        collapseBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
        collapseBtn.title = "Minimize chart";

        setTimeout(() => {
          if (this.chart) {
            this.chart.resize();
          }
        }, 300);
      } else {
        chartContainer.classList.add("collapsed");
        chartContainer.classList.remove("expanded");
        collapseBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
        collapseBtn.title = "Show chart";
      }
    }

    setupSearchableDropdown() {
      const searchInput = document.getElementById("chartStateSearch");
      const searchResults = document.getElementById("stateSearchResults");

      if (!searchInput || !searchResults) return;

      searchInput.addEventListener("focus", () => {
        this.showAllStates();
      });

      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query === "") {
          this.showAllStates();
        } else {
          this.filterStates(query);
        }
        this.selectedSearchIndex = -1;
      });

      searchInput.addEventListener("keydown", (e) => {
        const items = searchResults.querySelectorAll(".search-item");

        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.selectedSearchIndex = Math.min(
            this.selectedSearchIndex + 1,
            items.length - 1
          );
          this.updateSearchSelection(items);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          this.selectedSearchIndex = Math.max(this.selectedSearchIndex - 1, -1);
          this.updateSearchSelection(items);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (
            this.selectedSearchIndex >= 0 &&
            items[this.selectedSearchIndex]
          ) {
            const selectedState = items[this.selectedSearchIndex].dataset.state;
            this.selectStateFromSearch(selectedState);
          }
        } else if (e.key === "Escape") {
          searchResults.style.display = "none";
          searchInput.blur();
        }
      });

      document.addEventListener("click", (e) => {
        if (
          !searchInput.contains(e.target) &&
          !searchResults.contains(e.target)
        ) {
          searchResults.style.display = "none";
        }
      });
    }

    showAllStates() {
      const searchResults = document.getElementById("stateSearchResults");
      if (!searchResults) return;

      searchResults.innerHTML = "";

      const allItem = this.createSearchItem("All", "All States Combined", true);
      searchResults.appendChild(allItem);

      const separator = document.createElement("div");
      separator.style.cssText = "height: 1px; background: #eee; margin: 4px 0;";
      searchResults.appendChild(separator);

      this.availableStates.forEach((state) => {
        if (state !== "All") {
          const item = this.createSearchItem(state, state, false);
          searchResults.appendChild(item);
        }
      });

      searchResults.style.display = "block";
    }

    filterStates(query) {
      const searchResults = document.getElementById("stateSearchResults");
      if (!searchResults) return;

      searchResults.innerHTML = "";

      if ("all states combined".includes(query)) {
        const allItem = this.createSearchItem(
          "All",
          "All States Combined",
          true
        );
        searchResults.appendChild(allItem);
      }

      const filtered = this.availableStates.filter(
        (state) => state !== "All" && state.toLowerCase().includes(query)
      );

      filtered.forEach((state) => {
        const item = this.createSearchItem(state, state, false);

        const regex = new RegExp(`(${query})`, "gi");
        const highlighted = state.replace(
          regex,
          '<span style="background: yellow; font-weight: bold;">$1</span>'
        );
        item.innerHTML = highlighted;
        item.dataset.state = state;

        searchResults.appendChild(item);
      });

      searchResults.style.display = "block";
    }

    createSearchItem(value, displayText, isSpecial = false) {
      const item = document.createElement("div");
      item.className = "search-item";
      item.dataset.state = value;
      item.textContent = displayText;

      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #f5f5f5;
        transition: background 0.2s;
        font-size: 13px;
        ${isSpecial ? "font-weight: 600; color: #2c3e50;" : "color: #34495e;"}
      `;

      item.addEventListener("mouseenter", () => {
        item.style.background = "#f8f9fa";
      });

      item.addEventListener("mouseleave", () => {
        item.style.background = item.classList.contains("selected")
          ? "#e3f2fd"
          : "white";
      });

      item.addEventListener("click", () => {
        this.selectStateFromSearch(value);
      });

      return item;
    }

    updateSearchSelection(items) {
      items.forEach((item, index) => {
        if (index === this.selectedSearchIndex) {
          item.classList.add("selected");
          item.style.background = "#e3f2fd";
          item.style.color = "#1976d2";
          item.scrollIntoView({ block: "nearest" });
        } else {
          item.classList.remove("selected");
          item.style.background = "white";
          item.style.color =
            item.dataset.state === "All" ? "#2c3e50" : "#34495e";
        }
      });
    }

    selectStateFromSearch(selectedState) {
      const searchInput = document.getElementById("chartStateSearch");
      const searchResults = document.getElementById("stateSearchResults");

      if (!searchInput || !searchResults) return;

      const displayText =
        selectedState === "All" ? "All States Combined" : selectedState;
      searchInput.value = displayText;

      searchResults.style.display = "none";

      if (!this.preventChartUpdate) {
        this.handleStateSelectionChange(selectedState);
      }

      console.log("Selected state from search:", selectedState);
    }

    handleStateSelectionChange(selectedState) {
      console.log("Chart state changed to:", selectedState);

      this.preventMapUpdate = true;

      try {
        if (selectedState === "All") {
          this.selectedStateName = null;
          this.selectedStateFeature = null;
          this.clearFlows();
          this.clearHighlight();
        } else {
          const geojson = this.map.getSource("states")?._data;
          if (geojson && geojson.features) {
            const stateFeature = geojson.features.find(
              (f) =>
                f.properties.STATENAM === selectedState ||
                f.properties.LABEL === selectedState
            );

            if (stateFeature) {
              this.selectedStateName = selectedState;
              this.selectedStateFeature = stateFeature;
              this.clearFlows();
              this.clearHighlight();
              this.updateHighlight(stateFeature);
              this.updateFlows(stateFeature);
            }
          }
        }

        this.updateChart();
        this.updateHistoryButtonState();
      } finally {
        this.preventMapUpdate = false;
      }
    }

    setupChartEventListeners() {
      const yearSelect = document.getElementById("chartYearSelect");
      const topCountriesSelect = document.getElementById("topCountries");

      if (yearSelect) {
        yearSelect.addEventListener("change", async () => {
          if (this.preventChartUpdate) return;

          const newYear = yearSelect.value;
          console.log("Chart year changed to:", newYear);

          this.preventMapUpdate = true;

          const mapSlider = document.getElementById(this.sliderId);
          if (mapSlider) {
            mapSlider.value = newYear;
            this.currentYear = newYear;
          }

          try {
            await this.updateMapForYear(newYear);
            await this.updateChartStateOptions();
            await this.updateChart();
          } finally {
            this.preventMapUpdate = false;
          }
        });
      }

      this.setupSearchableDropdown();

      if (topCountriesSelect) {
        topCountriesSelect.addEventListener("change", async () => {
          await this.updateChart();
        });
      }

      const chartContainer = document.getElementById("immi-chart");
      if (chartContainer) {
        chartContainer.addEventListener("click", (e) => {
          if (e.target === chartContainer) {
            this.closeChart();
          }
        });
      }
    }

    async updateMapForYear(year) {
      const warningFlag = document.getElementById("legend-warning-flag");
      const metadata = this.yearMetadata?.[year];

      if (metadata && (metadata.raceLimited || metadata.sample)) {
        warningFlag.title = metadata.note;
        warningFlag.style.display = "inline";
      } else {
        warningFlag.style.display = "none";
      }

      const legendYearElement = document.getElementById("legend-year");
      if (legendYearElement) {
        legendYearElement.textContent = year;
      }

      const { geoJson, labels } = await this.loadStateData(year);

      if (this.map.getSource("states")) {
        this.map.getSource("states").setData(geoJson);
      }

      if (this.map.getSource("state-labels")) {
        this.map.getSource("state-labels").setData(labels);
      }

      this.clearFlows();
      this.clearHighlight();

      if (this.selectedStateName) {
        const matched = geoJson.features.find(
          (f) =>
            f.properties.STATENAM === this.selectedStateName ||
            f.properties.LABEL === this.selectedStateName
        );
        if (matched) {
          this.selectedStateFeature = matched;
          this.updateHighlight(matched);
          this.updateFlows(matched);
        } else {
          console.warn(
            `State ${this.selectedStateName} not found in year ${year}`
          );
          this.clearHighlight();
          this.clearFlows();

          if (this.selectedStateName && this.selectedStateName !== "All") {
            if (typeof showModal === "function") showModal();
          }

          this.selectedStateFeature = null;
          this.selectedStateName = null;
        }
      }

      document.querySelectorAll(".slider-tick").forEach((tick) => {
        if (parseInt(tick.dataset.year) === parseInt(year)) {
          tick.style.backgroundColor = "#000";
          tick.style.height = "15px";
        } else {
          tick.style.backgroundColor = "black";
          tick.style.height = "10px";
        }
      });

      console.log(`Map updated for year: ${year}`);
    }

    generateChartColors(count) {
      const colors = [];
      const baseHue = 210;

      for (let i = 0; i < count; i++) {
        const hue = (baseHue + i * 25) % 360;
        const saturation = 70 + (i % 3) * 10;
        const lightness = 45 + (i % 4) * 8;
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
      }
      return colors;
    }

    extractChartImmigrationData(stateFeature) {
      const immigrationData = {};

      Object.entries(stateFeature.properties)
        .filter(([key, value]) => this.countryCoordinates[key] && value > 0)
        .forEach(([country, people]) => {
          immigrationData[country] = Number(people);
        });

      return immigrationData;
    }

    async updateChartStateOptions() {
      const searchInput = document.getElementById("chartStateSearch");
      if (!searchInput) return;

      const year = this.currentYear;
      const currentSelection = this.selectedStateName || "All";

      this.preventChartUpdate = true;

      try {
        const { geoJson } = await this.loadStateData(year);

        if (!geoJson || !geoJson.features) {
          console.warn("No state data available for year:", year);
          this.availableStates = ["All"];
          return;
        }

        const stateNames = geoJson.features
          .map(
            (feature) =>
              feature.properties.STATENAM ||
              feature.properties.LABEL ||
              "Unknown"
          )
          .filter((stateName) => stateName !== "Unknown")
          .sort();

        this.availableStates = ["All", ...stateNames];

        if (
          currentSelection &&
          this.availableStates.includes(currentSelection)
        ) {
          const displayText =
            currentSelection === "All"
              ? "All States Combined"
              : currentSelection;
          searchInput.value = displayText;
        } else {
          searchInput.value = "All States Combined";
        }

        console.log(
          `Search: Loaded ${stateNames.length} states for year ${year}`
        );
      } catch (error) {
        console.error("Error updating chart state options:", error);
      } finally {
        this.preventChartUpdate = false;
      }
    }

    async updateChart() {
      const yearSelect = document.getElementById("chartYearSelect");
      const searchInput = document.getElementById("chartStateSearch");
      const topCountriesSelect = document.getElementById("topCountries");

      if (!yearSelect || !searchInput || !topCountriesSelect) {
        console.warn("Chart controls not found");
        return;
      }

      const year = this.currentYear;
      const selectedState = this.selectedStateName || "All";
      const topCountSelection = topCountriesSelect.value;

      console.log("Updating chart:", year, selectedState, topCountSelection);

      try {
        const { geoJson } = await this.loadStateData(year);

        if (!geoJson || !geoJson.features) {
          console.warn("No data available for year:", year);
          this.showNoChartDataMessage();
          return;
        }

        let countryData = {};

        if (selectedState === "All") {
          geoJson.features.forEach((feature) => {
            const stateImmigrationData =
              this.extractChartImmigrationData(feature);
            Object.entries(stateImmigrationData).forEach(([country, count]) => {
              countryData[country] = (countryData[country] || 0) + count;
            });
          });
        } else {
          const stateFeature = geoJson.features.find((feature) => {
            const stateName =
              feature.properties.STATENAM || feature.properties.LABEL;
            return stateName === selectedState;
          });

          if (stateFeature) {
            countryData = this.extractChartImmigrationData(stateFeature);
          } else {
            console.warn("Selected state not found:", selectedState);
            this.showNoChartDataMessage();
            return;
          }
        }

        countryData = Object.fromEntries(
          Object.entries(countryData).filter(([, count]) => count > 0)
        );

        let sortedData = Object.entries(countryData).sort(
          ([, a], [, b]) => b - a
        );

        if (topCountSelection !== "all") {
          const topCount = parseInt(topCountSelection);
          sortedData = sortedData.slice(0, topCount);
        }

        const countries = sortedData.map(([country]) => country);
        const values = sortedData.map(([, value]) => value);
        const colors = this.generateChartColors(countries.length);

        const totalImmigrants = values.reduce((sum, val) => sum + val, 0);
        const topCountry = countries[0] || "-";
        const countryCount = countries.length;
        const topCountryValue = values[0] || 0;
        const topCountryPercentage =
          totalImmigrants > 0
            ? Math.round((topCountryValue / totalImmigrants) * 100)
            : 0;

        document.getElementById("totalImmigrants").textContent =
          totalImmigrants.toLocaleString();
        document.getElementById("topCountry").textContent = topCountry;
        document.getElementById("countryCount").textContent = countryCount;
        document.getElementById(
          "topCountryPercent"
        ).textContent = `${topCountryPercentage}%`;

        if (this.chart) {
          this.chart.destroy();
          this.chart = null;
        }

        if (countries.length === 0) {
          this.showNoChartDataMessage();
          return;
        }

        const canvas = document.getElementById("immigrationChart");
        if (!canvas) {
          console.error("Canvas element not found!");
          return;
        }

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.width = "100%";
        canvas.style.height = "400px";

        const stateText =
          selectedState === "All" ? "All States" : selectedState;
        const countText =
          topCountSelection === "all"
            ? "All Countries"
            : `Top ${topCountSelection}`;

        try {
          this.chart = new Chart(ctx, {
            type: "bar",
            data: {
              labels: countries,
              datasets: [
                {
                  label: `Immigrants in ${year}`,
                  data: values,
                  backgroundColor: colors,
                  borderColor: colors.map((color) =>
                    color.replace("hsl", "hsla").replace(")", ", 0.8)")
                  ),
                  borderWidth: 1,
                },
              ],
            },
            options: {
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: `Immigration by Country - ${year} (${stateText}) - ${countText}`,
                  font: { size: 16, weight: "bold" },
                },
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      const stateInfo =
                        selectedState === "All"
                          ? "across all states"
                          : `to ${selectedState}`;
                      return `${context.parsed.x.toLocaleString()} immigrants ${stateInfo}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: "Number of Immigrants",
                    font: { size: 12, weight: "bold" },
                  },
                  ticks: {
                    callback: function (value) {
                      return value.toLocaleString();
                    },
                  },
                },
                y: {
                  title: {
                    display: true,
                    text: "Country of Origin",
                    font: { size: 12, weight: "bold" },
                  },
                },
              },
              animation: { duration: 1000, easing: "easeInOutQuart" },
              layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } },
            },
          });

          setTimeout(() => {
            if (this.chart) {
              this.chart.resize();
            }
          }, 100);

          console.log("Chart created successfully");
        } catch (chartError) {
          console.error("Error creating chart:", chartError);
          this.showNoChartDataMessage();
          return;
        }

        console.log(
          `Chart updated for ${year} - ${stateText} - ${countries.length} countries`
        );
        this.updateHistoryButtonState();
      } catch (error) {
        console.error("Error updating chart:", error);
        this.showNoChartDataMessage();
      }
    }

    showNoChartDataMessage() {
      document.getElementById("totalImmigrants").textContent = "0";
      document.getElementById("topCountry").textContent = "-";
      document.getElementById("countryCount").textContent = "0";
      document.getElementById("topCountryPercent").textContent = "0%";

      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      const canvas = document.getElementById("immigrationChart");
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Arial";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(
          "No immigration data available",
          ctx.canvas.width / 2,
          ctx.canvas.height / 2 - 10
        );
        ctx.fillText(
          "for this selection",
          ctx.canvas.width / 2,
          ctx.canvas.height / 2 + 15
        );
      }
    }

    showChart(year = null, state = null) {
      const chartContainer = document.getElementById("immi-chart");
      if (!chartContainer) {
        console.warn("Chart container #immi-chart not found");
        return;
      }

      const currentYear = year || this.currentYear;
      const currentState = state || this.selectedStateName || "All";

      this.preventChartUpdate = true;

      const yearSelect = document.getElementById("chartYearSelect");
      if (yearSelect && yearSelect.value !== currentYear) {
        yearSelect.value = currentYear;
      }

      this.updateChartStateOptions().then(() => {
        const searchInput = document.getElementById("chartStateSearch");
        if (searchInput) {
          const displayText =
            currentState === "All" ? "All States Combined" : currentState;
          searchInput.value = displayText;
        }

        this.preventChartUpdate = false;
        this.updateChart();
      });

      this.updateHistoryButtonState();
      console.log("Chart updated and synchronized");
    }

    initializeControls() {
      this.map.addControl(new maplibregl.NavigationControl(), "bottom-right");
      this.map.addControl(
        new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }),
        "bottom-left"
      );
      this.addCustomZoomToExtentButton();
    }

    addCustomZoomToExtentButton() {
      const button = document.createElement("button");
      button.className = "custom-zoom-to-extent-button-immigration";
      button.innerHTML = '<img src="img/extent.png" alt="Zoom to Extent">';

      const tooltip = document.createElement("div");
      tooltip.className = "custom-zoom-to-extent-tooltip-immigration";
      tooltip.textContent = "Zoom to Extent";

      button.appendChild(tooltip);
      button.addEventListener("click", () => {
        this.map.easeTo({
          center: [-98.35, 39.5],
          zoom: 3,
          pitch: 0,
          bearing: 0,
          essential: true,
        });
      });

      this.map.getContainer().appendChild(button);
    }

    loadCountryCoordinates() {
      fetch("assets/countryCoordinates.json")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          this.countryCoordinates = data;
          console.log("Loaded country coordinates", this.countryCoordinates);
        })
        .catch((error) => {
          console.error("Error loading country coordinates:", error);
        });
    }

    // FIXED: Improved loadHistoricalContext with better error handling
    loadHistoricalContext() {
      fetch("assets/config/historicalContext.json")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          this.historicalContext = data;
          console.log(
            "Loaded historical context for",
            Object.keys(data).length,
            "countries"
          );
          console.log("Available countries:", Object.keys(data));
          console.log("Sample data structure:", data);
        })
        .catch((error) => {
          console.error("Error loading historical context:", error);
          console.warn("Historical context features will not be available");
          this.historicalContext = {};
        });
    }

    async loadLimitMetadata() {
      try {
        const response = await fetch("assets/limit/Immilimit.json");
        if (!response.ok) throw new Error("Failed to load metadata.");
        this.yearMetadata = await response.json();
        console.log("Limit metadata loaded", this.yearMetadata);
      } catch (error) {
        console.error("Error loading limit metadata:", error);
        this.yearMetadata = {};
      }
    }

    async loadStateData(year) {
      const stateGeoJsonUrl = `assets/immigration/FOREIGN_${year}.geojson`;
      try {
        const response = await fetch(stateGeoJsonUrl);
        const geoJson = await response.json();

        if (!geoJson || geoJson.type !== "FeatureCollection") {
          console.error("Invalid GeoJSON data:", geoJson);
          return { geoJson, labels: null };
        }

        const labelFeatures = geoJson.features.map((feature) => {
          const stateCentroid = turf.centroid(feature).geometry.coordinates;
          const stateName =
            feature.properties.STATENAM ||
            feature.properties.LABEL ||
            "Unknown";

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: stateCentroid,
            },
            properties: { label: stateName },
          };
        });

        return {
          geoJson,
          labels: {
            type: "FeatureCollection",
            features: labelFeatures,
          },
        };
      } catch (error) {
        console.error("Error loading state data:", error);
        return {
          geoJson: { type: "FeatureCollection", features: [] },
          labels: null,
        };
      }
    }

    generateFlowsForState(stateFeature) {
      const stateCentroid = turf.centroid(stateFeature).geometry.coordinates;
      const flowFeatures = [];
      const circleFeatures = [];

      Object.entries(stateFeature.properties)
        .filter(([key, value]) => this.countryCoordinates[key] && value > 0)
        .forEach(([country, people]) => {
          people = Number(people);
          const countryCoords = this.countryCoordinates[country];
          const line = turf.lineString([countryCoords, stateCentroid]);

          flowFeatures.push({
            type: "Feature",
            geometry: line.geometry,
            properties: { people },
          });

          const radius = this.calculateGraduatedSize(people);
          const color = this.calculateGraduatedColor(people);

          circleFeatures.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: countryCoords,
            },
            properties: {
              people,
              country,
              radius,
              color,
            },
          });
        });

      return { flowFeatures, circleFeatures };
    }

    calculateGraduatedSize(value) {
      if (value < 50) return 2.5;
      if (value < 500) return 6;
      if (value < 5000) return 9;
      if (value < 50000) return 11.5;
      return 15;
    }

    calculateGraduatedColor(value) {
      if (value < 50) return "#ffffcc";
      if (value < 500) return "#a1dab4";
      if (value < 5000) return "#41b6c4";
      if (value < 50000) return "#2c7fb8";
      return "#253494";
    }

    updateLegend() {
      const legendYearElement = document.getElementById("legend-year-value");
      if (legendYearElement) {
        legendYearElement.textContent = this.currentYear;
      }
    }

    updateHighlight(feature) {
      if (this.map.getSource("state-highlight")) {
        const cloned = JSON.parse(JSON.stringify(feature));
        this.map.getSource("state-highlight").setData({
          type: "FeatureCollection",
          features: [cloned],
        });
      }
    }

    clearHighlight() {
      if (this.map.getSource("state-highlight")) {
        this.map.getSource("state-highlight").setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }

    updateFlows(stateFeature) {
      const stateName =
        stateFeature.properties.STATENAM ||
        stateFeature.properties.LABEL ||
        "Unknown State";

      const { flowFeatures, circleFeatures } =
        this.generateFlowsForState(stateFeature);

      if (flowFeatures.length === 0) {
        if (typeof showModal === "function") showModal();
        return;
      }

      if (this.map.getSource("flows")) {
        this.map.getSource("flows").setData({
          type: "FeatureCollection",
          features: flowFeatures,
        });
      }

      if (this.map.getSource("proportional-circles")) {
        this.map.getSource("proportional-circles").setData({
          type: "FeatureCollection",
          features: circleFeatures,
        });

        this.map.setPaintProperty("circle-layer", "circle-radius", [
          "get",
          "radius",
        ]);
        this.map.setPaintProperty("circle-layer", "circle-color", [
          "get",
          "color",
        ]);
      }

      this.updateLegend();
      this.showChart(this.currentYear, stateName);

      console.log(`Updated migration data for ${stateName}`);
    }

    clearFlows() {
      if (this.map.getSource("flows")) {
        this.map.getSource("flows").setData({
          type: "FeatureCollection",
          features: [],
        });
      }

      if (this.map.getSource("proportional-circles")) {
        this.map.getSource("proportional-circles").setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }

    async initializeMap() {
      this.map.on("load", async () => {
        console.log("Map fully loaded, now loading immigration data...");
        await this.loadLimitMetadata();

        const { geoJson, labels } = await this.loadStateData(this.currentYear);

        this.map.addSource("states", { type: "geojson", data: geoJson });
        this.updateLegend();

        const warningFlag = document.getElementById("legend-warning-flag");
        const metadata = this.yearMetadata[this.currentYear];

        if (metadata && (metadata.raceLimited || metadata.sample)) {
          warningFlag.title = metadata.note;
          warningFlag.style.display = "inline";
        } else {
          warningFlag.style.display = "none";
        }

        this.map.addLayer({
          id: "state-boundaries",
          type: "fill",
          source: "states",
          paint: { "fill-color": "transparent", "fill-opacity": 1 },
        });

        this.map.addLayer({
          id: "state-borders",
          type: "line",
          source: "states",
          paint: { "line-color": "#000000", "line-width": 0.2 },
        });

        if (labels && labels.features.length > 0) {
          if (this.map.getSource("state-labels")) {
            this.map.getSource("state-labels").setData(labels);
          } else {
            this.map.addSource("state-labels", {
              type: "geojson",
              data: labels,
            });
            this.map.addLayer({
              id: "state-labels-layer",
              type: "symbol",
              source: "state-labels",
              layout: {
                "text-field": ["get", "label"],
                "text-font": ["Metropolis-Bold"],
                "text-size": 10,
                "text-anchor": "center",
              },
              paint: {
                "text-color": "#000",
                "text-halo-color": "#FFF",
                "text-halo-width": 1,
              },
            });
          }
        }

        this.map.addSource("state-highlight", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        this.map.addLayer(
          {
            id: "state-highlight-layer",
            type: "line",
            source: "state-highlight",
            paint: {
              "line-color": "#FF5733",
              "line-width": 3,
              "line-dasharray": [2, 2],
              "line-opacity": 1,
            },
          },
          "state-borders"
        );

        this.map.addSource("flows", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        this.map.addLayer({
          id: "flow-lines",
          type: "line",
          source: "flows",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#f0f2f2",
            "line-width": 1.5,
            "line-opacity": 0.8,
            "line-blur": 0.2,
          },
        });

        this.map.addSource("proportional-circles", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        this.map.addLayer({
          id: "circle-layer",
          type: "circle",
          source: "proportional-circles",
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": ["get", "color"],
            "circle-opacity": 1,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000",
          },
        });

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
        });

        this.map.on("mouseenter", "circle-layer", (e) => {
          this.map.getCanvas().style.cursor = "pointer";
          if (!e.features.length) return;

          const feature = e.features[0];
          const country = feature.properties.country || "Unknown Country";
          const people = feature.properties.people || 0;
          const state = this.selectedStateName || "Unknown State";
          const year = this.currentYear || "Unknown Year";
          const peopleText = people === 1 ? "person" : "people";
          const peopleFormatted = people.toLocaleString("en-US");

          const description = `<strong>${peopleFormatted}</strong> ${peopleText} immigrated to <strong>${state}</strong> from <strong>${country}</strong> in <strong>${year}</strong>.`;

          popup.setLngLat(e.lngLat).setHTML(description).addTo(this.map);
        });

        this.map.on("mouseleave", "circle-layer", (e) => {
          this.map.getCanvas().style.cursor = "";
          popup.remove();
        });

        this.map.on("click", "state-boundaries", (e) => {
          if (this.preventMapUpdate) return;

          const clickedFeature = e.features[0];
          const clickedStateName =
            clickedFeature.properties.STATENAM ||
            clickedFeature.properties.LABEL;

          this.clearFlows();
          this.clearHighlight();

          this.selectedStateName = clickedStateName;
          this.selectedStateFeature = clickedFeature;

          this.updateHighlight(clickedFeature);
          this.updateFlows(clickedFeature);

          this.preventChartUpdate = true;
          const searchInput = document.getElementById("chartStateSearch");
          if (searchInput) {
            const displayText =
              clickedStateName === "All"
                ? "All States Combined"
                : clickedStateName;
            searchInput.value = displayText;
          }
          this.preventChartUpdate = false;

          this.updateChart();
          this.updateHistoryButtonState();

          console.log(`Clicked and highlighted: ${clickedStateName}`);
        });

        const flag = document.getElementById("legend-warning-flag");
        if (flag) {
          flag.addEventListener("click", () => {
            const metadata = this.yearMetadata?.[this.currentYear];
            if (metadata && metadata.note) {
              const content = `
                <p>${metadata.note}</p>
                ${
                  metadata.source
                    ? `<p style="margin-top: 10px; font-size: 0.9em; color: #666;"><strong>Source:</strong> ${metadata.source}</p>`
                    : ""
                }
              `;
              if (window.showInfoModal) {
                window.showInfoModal("Data Limitation", content);
              }
            }
          });
        }

        this.updateHistoryButtonState();
        this.showChart(this.currentYear, "All");
      });

      document
        .getElementById(this.sliderId)
        .addEventListener("input", async (event) => {
          if (this.preventMapUpdate) return;

          const rawYear = parseInt(event.target.value);
          const slider = event.target;

          let snappedYear = this.enabledYears.reduce(
            (prev, curr) =>
              Math.abs(curr - rawYear) < Math.abs(prev - rawYear) ? curr : prev,
            this.enabledYears[0]
          );

          if (snappedYear !== rawYear) {
            slider.value = snappedYear;
          }

          this.currentYear = snappedYear;

          this.preventChartUpdate = true;
          const chartYearSelect = document.getElementById("chartYearSelect");
          if (
            chartYearSelect &&
            chartYearSelect.value !== snappedYear.toString()
          ) {
            chartYearSelect.value = snappedYear;
          }
          this.preventChartUpdate = false;

          await this.updateMapForYear(snappedYear);
          await this.updateChartStateOptions();
          await this.updateChart();
          this.updateHistoryButtonState();

          console.log(`Slider updated for year: ${snappedYear}`);
        });
    }

    async generateSliderTicks() {
      const slider = document.getElementById(this.sliderId);
      const sliderTicksContainer = document.getElementById(this.sliderTicksId);
      sliderTicksContainer.innerHTML = "";
      this.enabledYears = [];

      for (
        let year = parseInt(slider.min);
        year <= parseInt(slider.max);
        year += parseInt(slider.step)
      ) {
        const tickWrapper = document.createElement("div");
        tickWrapper.className = "slider-tick-wrapper";

        const tick = document.createElement("div");
        tick.className = "slider-tick";
        tick.dataset.year = year;

        const label = document.createElement("div");
        label.className = "slider-label";
        label.textContent = year;

        tickWrapper.appendChild(tick);
        tickWrapper.appendChild(label);
        sliderTicksContainer.appendChild(tickWrapper);

        const { geoJson } = await this.loadStateData(year);

        let hasFlows = false;
        for (const feature of geoJson.features) {
          const { flowFeatures } = this.generateFlowsForState(feature);
          if (flowFeatures.length > 0) {
            hasFlows = true;
            break;
          }
        }

        if (!hasFlows && year !== parseInt(this.currentYear)) {
          tick.classList.add("disabled-tick");
          tick.title = "No data available for this year";
          tick.style.opacity = "0.5";
          tick.style.cursor = "default";
          label.style.color = "#aaa";
          label.title = "No data available for this year";
        } else {
          this.enabledYears.push(year);
          tick.addEventListener("click", () => {
            slider.value = year;
            slider.dispatchEvent(new Event("input"));
          });
        }
      }

      console.log("Slider ticks generated");
    }

    // Cleanup method to prevent memory leaks
    cleanup() {
      this.closeActiveModal();
      if (this.handleEscapeKey) {
        document.removeEventListener("keydown", this.handleEscapeKey);
      }
    }
  }

  const immigrationMapInstance = new ImmigrationMap(
    "mapImmigration",
    "slider-immigration",
    "slider-ticks-container"
  );

  window.ImmigrationMap = immigrationMapInstance;

  function toggleLegend() {
    const legend = document.getElementById("immigrationLegend");
    const collapseBtn = document.getElementById("collapseLegendBtn");

    if (legend.classList.contains("collapsed")) {
      legend.classList.remove("collapsed");
      collapseBtn.innerHTML = '<i class="bi bi-arrow-bar-right"></i>';
      collapseBtn.title = "Minimize legend";
    } else {
      legend.classList.add("collapsed");
      collapseBtn.innerHTML = '<i class="bi bi-arrow-bar-left"></i>';
      collapseBtn.title = "Show legend";
    }
  }

  const collapseBtn = document.getElementById("collapseLegendBtn");
  if (collapseBtn) {
    collapseBtn.addEventListener("click", toggleLegend);
  }

  console.log("ImmigrationMap ready");
});
