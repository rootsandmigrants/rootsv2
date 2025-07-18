document.addEventListener("DOMContentLoaded", function () {
  // ✅ Then immediately define the helper
  function updateAllMaps(year) {
    animNamespace.loadShapefile(year);
    densityNamespace.loadMapData(year);
    migrationNamespace.loadShapefile(year);
    updateLayersByYear(year); // ✅ add this line to ensure cession layers auto-load
  }
  const modals = document.querySelectorAll(".modal-event");
  const spans = document.querySelectorAll(".close-modal");
  const storyPopUps = document.querySelectorAll(".story-pop-up");
  const timelines = document.querySelectorAll(".timeline");
  const slider = document.getElementById("slider");
  const toggleButton = document.querySelector(".toggle-timeline");
  const storyModals = document.querySelectorAll(".story-modal");
  // Get the "Show Narrative" checkbox
  const narrativeCheckbox = document.getElementById("toggleNarrative");
  // Initially hide the story pop-ups and modals

  modals.forEach((modal) => (modal.style.display = "none"));
  storyPopUps.forEach((story) => (story.style.display = "none"));
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("close-pop-up")) {
      storyPopUps.forEach((s) => (s.style.display = "none"));
    }
  });

  function showModal(modal, content) {
    // ✅ Hide story pop-up
    storyPopUps.forEach((story) => {
      story.style.display = "none";
    });
    const contentContainer = modal.querySelector(".modals-content");

    // Inject the content
    contentContainer.innerHTML = content;

    // Reset display
    modal.style.display = "flex";
    modal.style.opacity = "1";
    modal.style.visibility = "visible";

    // Remove old content-type classes
    modal.classList.remove("image-modal", "video-modal", "prompt-modal");

    // Detect type of content and apply appropriate class
    if (content.includes("<iframe")) {
      modal.classList.add("video-modal");
    } else if (content.includes("<img")) {
      modal.classList.add("image-modal");

      // Add magnify to modal image
      setTimeout(() => {
        const img = modal.querySelector("img");
        if (img && !img.classList.contains("zoomable")) {
          img.classList.add("zoomable");
          magnify(img, 2); // 🔍 Adjust zoom level as needed
        }
      }, 300); // short delay to ensure it's in the DOM
    } else {
      modal.classList.add("prompt-modal");
    }
  }

  // Function to create legend containers if they don't exist

  function ensureLegendContainers() {
    let legendContainer = document.getElementById("overlay-legend-container");
    let legendHistory = document.getElementById(
      "overlay-legend-container-history"
    );
    // Create #overlay-legend-container if it doesn't exist

    if (!legendContainer) {
      legendContainer = document.createElement("div");
      legendContainer.id = "overlay-legend-container";
      legendContainer.className = "overlay-legend";
      document.getElementById("mapDen").appendChild(legendContainer);
    }

    if (!legendHistory) {
      legendHistory = document.createElement("div");
      legendHistory.id = "overlay-legend-container-history";
      legendHistory.className = "overlay-legend";
      document.getElementById("map").appendChild(legendHistory);
    }

    return { legendContainer, legendHistory };
  }

  // Toggle functionality for collapsing/expanding the timeline and shifting legends

  toggleButton.addEventListener("click", () => {
    const collapsed = storyModals[0].classList.contains("collapsed");
    storyModals.forEach((modal) => modal.classList.toggle("collapsed"));
    storyPopUps.forEach((popup) =>
      popup.classList.toggle("shifted-left", !collapsed)
    );

    const { legendContainer, legendHistory } = ensureLegendContainers();
    legendContainer.classList.toggle("shifted-left-legend-pop", !collapsed);
    legendHistory.classList.toggle("shifted-left-legend-history", !collapsed);
    toggleButton.textContent = collapsed ? "-" : "📖";
    toggleButton.title = collapsed ? "Close Timeline" : "Show Key Event";
  });

  spans.forEach((span) => {
    span.onclick = () => {
      const modal = span.closest(".modal-event");
      modal.style.display = "none";
      modal.querySelector(".modals-content").innerHTML = "";

      // ✅ Optionally re-show the story pop-up
      storyPopUps.forEach((story) => {
        story.style.display = "block";
      });
    };
  });

  // Close the modal when clicking outside of it

  window.onclick = function (e) {
    modals.forEach((modal) => {
      if (e.target === modal) {
        modal.style.display = "none";
        modal.querySelector(".modals-content").innerHTML = "";

        // ✅ Optionally re-show the story pop-up
        storyPopUps.forEach((story) => {
          story.style.display = "block";
        });
      }
    });
  };

  Promise.all([
    fetch("assets/narration/events.json").then((r) => r.json()),
    fetch("assets/narration/story.json").then((r) => r.json()),
    fetch("assets/narration/questions.json").then((r) => r.json()),
  ]).then(([events, stories, questions]) => {
    function createTimelineAndStory(timeline, storyPopUp) {
      events.forEach((event) => {
        const container = document.createElement("div");
        container.className = "container left";

        const dateDiv = document.createElement("div");
        dateDiv.className = "date";
        dateDiv.textContent = event.year;

        const eventDiv = document.createElement("div");
        eventDiv.className = "event";
        eventDiv.textContent = event.description;

        container.appendChild(dateDiv);
        container.appendChild(eventDiv);
        timeline.appendChild(container);
        container.addEventListener("click", () => {
          // ✅ Close ALL popups and modals across tabs
          modals.forEach((m) => {
            m.style.display = "none";
            m.querySelector(".modals-content").innerHTML = "";
          });
          storyPopUps.forEach((s) => (s.style.display = "none"));

          // ✅ Trigger update
          slider.value = event.year;
          slider.dispatchEvent(new Event("input"));
          if (!narrativeCheckbox.checked) {
            displayStoryPopUp(event);
          }
        });
      });
    }

    function insertQuestionButton(storyPopUp, year, targetType, description) {
      const matchedQs = questions.filter(
        (q) =>
          q.year === year &&
          q.target === targetType &&
          q.description === description
      );

      if (matchedQs.length === 0) return;

      const btn = document.createElement("button");
      btn.className = "question-button";
      btn.title = "Questions Available";
      btn.textContent = "❓";
      storyPopUp.appendChild(btn);

      btn.addEventListener("click", function () {
        const parentTab = this.closest(".tab-pane");
        const modal = parentTab.querySelector(".modal-event");

        const types = [
          { key: "DBQ", label: "Document-Based Question (DBQ)" },
          { key: "FRQ", label: "Free Response Question (FRQ)" },
          { key: "Discussion Prompts", label: "Discussion Prompts" },
          { key: "Long Essay", label: "Long Essay" },
        ];

        const groupedContent = types
          .map(({ key, label }) => {
            const items = matchedQs.filter((q) => q.type === key);
            if (items.length === 0) return "";

            return `
              <h3>${label}</h3>
              ${items
                .map((q) => {
                  let sourceHTML = "";

                  if (q.sources && q.sources.length > 0) {
                    sourceHTML = `
<div><ul style="list-style: none; padding-left: 0;">
                        ${q.sources
                          .map(
                            (s) => `
                              <li style="margin-bottom: 15px;">
                                <img src="${s.image}" alt="DBQ Source" style="max-width: 100%; margin: 8px 0;" class="zoomable"/>
                              </li>`
                          )
                          .join("")}
                      </ul></div>`;
                  }

                  return `
                    <p>${q.prompt}</p>
${q.task ? `<p class="task-text">${q.task.replace(/\n/g, "<br>")}</p>` : ""}
                    ${sourceHTML}
                    ${
                      q.questions && q.questions.length > 0
                        ? `<ul>${q.questions
                            .map((item) => `<li>${item}</li>`)
                            .join("")}</ul>`
                        : ""
                    }
                  `;
                })
                .join("<br>")}
            `;
          })
          .filter((section) => section !== "")
          .join("<hr>");

        showModal(modal, groupedContent);
      });
    }

    function displayStoryPopUp(event) {
      storyPopUps.forEach((storyPopUp) => {
        storyPopUp.innerHTML = "";
        storyPopUp.style.display = "block";

        const titleRow = document.createElement("div");
        titleRow.className = "story-title-row";

        const title = document.createElement("h3");
        title.className = "story-title";
        title.textContent = event.description;

        const closeBtn = document.createElement("span");
        closeBtn.className = "close-pop-up";
        closeBtn.textContent = "×";

        titleRow.appendChild(title);
        storyPopUp.appendChild(titleRow);

        // Insert ❓ into titleRow, not storyPopUp
        insertQuestionButton(titleRow, event.year, "event", event.description);
        titleRow.appendChild(closeBtn);

        const text = document.createElement("p");
        text.textContent = event.story;

        // storyPopUp.appendChild(title);
        storyPopUp.appendChild(text);

        if (Array.isArray(event.images)) {
          event.images.forEach((src) => {
            const img = document.createElement("img");
            img.src = src;
            img.alt = event.description;
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.marginBottom = "10px";

            img.addEventListener("click", function () {
              const modal =
                this.closest(".tab-pane").querySelector(".modal-event");
              showModal(
                modal,
                `<img src="${this.src}" style="max-width: 100%">`
              );
            });
            storyPopUp.appendChild(img);
          });
        }

        if (event.video) {
          const link = document.createElement("a");
          link.textContent = "Show Video";
          link.href = "#";
          link.className = "show-video-link";
          link.addEventListener("click", function (e) {
            e.preventDefault();
            const modal =
              this.closest(".tab-pane").querySelector(".modal-event");
            showModal(
              modal,
              `<iframe width="560" height="315" src="${event.video}" frameborder="0" allowfullscreen></iframe>`
            );
          });
          storyPopUp.appendChild(link);
        }

        if (Array.isArray(event.resources)) {
          event.resources.forEach((resObj) => {
            const res = document.createElement("a");
            res.innerHTML = `🔗 ${resObj.label || "🔗 Related Resource"}`;
            res.href = resObj.url;
            res.target = "_blank";
            res.className = "resource-link";
            storyPopUp.appendChild(res);
          });
        } else if (event.resources) {
          const res = document.createElement("a");
          res.innerHTML = `🔗 Related Resource`;
          res.href = event.resources;
          res.target = "_blank";
          res.className = "resource-link";
          storyPopUp.appendChild(res);
        }
      });
    }

    function displayGeneralStoryPopUp(story) {
      storyPopUps.forEach((storyPopUp) => {
        storyPopUp.innerHTML = "";
        storyPopUp.style.display = "block";

        const titleRow = document.createElement("div");
        titleRow.className = "story-title-row";

        const title = document.createElement("h3");
        title.className = "story-title";
        title.textContent = story.description;

        const closeBtn = document.createElement("span");
        closeBtn.className = "close-pop-up";
        closeBtn.textContent = "×";
        titleRow.appendChild(title);
        // Insert ❓ into titleRow, not storyPopUp
        insertQuestionButton(titleRow, story.year, "story", story.description);
        titleRow.appendChild(closeBtn);

        storyPopUp.appendChild(titleRow);

        const text = document.createElement("p");
        text.textContent = story.story;

        storyPopUp.appendChild(text);

        if (Array.isArray(story.images)) {
          story.images.forEach((src) => {
            const img = document.createElement("img");
            img.src = src;
            img.alt = story.description;
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.marginBottom = "10px";

            img.addEventListener("click", function () {
              const modal = document.querySelector(".modal-event");
              showModal(
                modal,
                `<img src="${this.src}" style="max-width: 100%">`
              );
            });
            storyPopUp.appendChild(img);
          });
        }

        if (story.video) {
          const link = document.createElement("a");
          link.textContent = "Show Video";
          link.href = "#";
          link.className = "show-video-link";
          link.addEventListener("click", function (e) {
            e.preventDefault();
            const modal = document.querySelector(".modal-event");
            showModal(
              modal,
              `<iframe width="560" height="315" src="${story.video}" frameborder="0" allowfullscreen></iframe>`
            );
          });
          storyPopUp.appendChild(link);
        }

        if (Array.isArray(story.resources)) {
          story.resources.forEach((resObj) => {
            const res = document.createElement("a");
            res.innerHTML = `🔗 ${resObj.label || "🔗 Related Resource"}`;
            res.href = resObj.url;
            res.target = "_blank";
            res.className = "resource-link";
            storyPopUp.appendChild(res);
          });
        } else if (story.resources) {
          const res = document.createElement("a");
          res.innerHTML = `🔗 Related Resource`;
          res.href = story.resources;
          res.target = "_blank";
          res.className = "resource-link";
          storyPopUp.appendChild(res);
        }
      });
    }

    function displayStoryForYear(year) {
      const match = events.filter((e) => e.year === year);
      if (match.length > 0) {
        match.forEach(displayStoryPopUp);
      } else {
        const story = stories.find((s) => s.year === year);
        if (story) {
          displayGeneralStoryPopUp(story);
        } else {
          storyPopUps.forEach((s) => (s.style.display = "none"));
        }
      }
    }

    timelines.forEach((timeline, i) => {
      createTimelineAndStory(timeline, storyPopUps[i]);
    });

    let sliderTimeout;
    slider.addEventListener("input", () => {
      const year = parseInt(slider.value);
      updateAllMaps(year); // ✅ ensures maps update on slider move
      updateLayersByYear(year);
      // ✅ Immediately close any open popups/modals
      storyPopUps.forEach((s) => (s.style.display = "none"));
      modals.forEach((m) => {
        m.style.display = "none";
        m.querySelector(".modals-content").innerHTML = "";
      });

      clearTimeout(sliderTimeout);
      sliderTimeout = setTimeout(() => {
        // ✅ Close modals
        modals.forEach((m) => {
          m.style.display = "none";
          m.querySelector(".modals-content").innerHTML = "";
        });
        if (narrativeCheckbox.checked) {
          const eventsInYear = events.filter((e) => e.year === year);
          const storiesInYear = stories.filter((s) => s.year === year);

          storyPopUps.forEach((storyPopUp) => {
            storyPopUp.innerHTML = "";
            storyPopUp.style.display = "block";

            if (eventsInYear.length === 0 && storiesInYear.length === 0) {
              storyPopUp.style.display = "none";
            }

            eventsInYear.forEach((event, i) => {
              const titleRow = document.createElement("div");
              titleRow.className = "story-title-row";

              const title = document.createElement("h3");
              title.className = "story-title";
              title.textContent = event.description;

              const closeBtn = document.createElement("span");
              closeBtn.className = "close-pop-up";
              closeBtn.textContent = "×";
              titleRow.appendChild(title);
              insertQuestionButton(
                titleRow,
                event.year,
                "event",
                event.description
              );

              titleRow.appendChild(closeBtn);
              storyPopUp.appendChild(titleRow);

              const text = document.createElement("p");
              text.textContent = event.story;
              // storyPopUp.appendChild(title);
              storyPopUp.appendChild(text);

              if (Array.isArray(event.images)) {
                event.images.forEach((src) => {
                  const img = document.createElement("img");
                  img.src = src;
                  img.alt = event.description;
                  img.style.maxWidth = "100%";
                  img.style.height = "auto";
                  img.style.marginBottom = "10px";

                  img.addEventListener("click", function () {
                    const modal =
                      this.closest(".tab-pane").querySelector(".modal-event");
                    showModal(
                      modal,
                      `<img src="${this.src}" style="max-width: 100%">`
                    );
                  });
                  storyPopUp.appendChild(img);
                });
              }

              if (event.video) {
                const link = document.createElement("a");
                link.textContent = "Show Video";
                link.href = "#";
                link.className = "show-video-link";
                link.addEventListener("click", function (e) {
                  e.preventDefault();
                  const modal = document.querySelector(".modal-event");
                  showModal(
                    modal,
                    `<iframe width="560" height="315" src="${event.video}" frameborder="0" allowfullscreen></iframe>`
                  );
                });
                storyPopUp.appendChild(link);
              }

              if (Array.isArray(event.resources)) {
                event.resources.forEach((resObj) => {
                  const res = document.createElement("a");
                  res.innerHTML = `🔗 ${resObj.label || "🔗 Related Resource"}`;
                  res.href = resObj.url;
                  res.target = "_blank";
                  res.className = "resource-link";
                  storyPopUp.appendChild(res);
                });
              } else if (event.resources) {
                const res = document.createElement("a");
                res.innerHTML = `🔗 Related Resource`;
                res.href = event.resources;
                res.target = "_blank";
                res.className = "resource-link";
                storyPopUp.appendChild(res);
              }

              if (i !== eventsInYear.length - 1) {
                storyPopUp.appendChild(document.createElement("hr"));
              }
            });

            // Add matching stories (non-timeline)
            storiesInYear.forEach((story) => {
              const titleRow = document.createElement("div");
              titleRow.className = "story-title-row";

              const title = document.createElement("h3");
              title.className = "story-title";
              title.textContent = story.description;

              const closeBtn = document.createElement("span");
              closeBtn.className = "close-pop-up";
              closeBtn.textContent = "×";
              titleRow.appendChild(title);
              insertQuestionButton(
                titleRow,
                story.year,
                "story",
                story.description
              );

              titleRow.appendChild(closeBtn);
              storyPopUp.appendChild(titleRow);

              const text = document.createElement("p");
              text.textContent = story.story;
              // storyPopUp.appendChild(title);
              storyPopUp.appendChild(text);

              if (Array.isArray(story.images)) {
                story.images.forEach((src) => {
                  const img = document.createElement("img");
                  img.src = src;
                  img.alt = story.description;
                  img.style.maxWidth = "100%";
                  img.style.height = "auto";
                  img.style.marginBottom = "10px";

                  img.addEventListener("click", function () {
                    const modal = document.querySelector(".modal-event");
                    showModal(
                      modal,
                      `<img src="${this.src}" style="max-width: 100%">`
                    );
                  });
                  storyPopUp.appendChild(img);
                });
              }

              if (story.video) {
                const link = document.createElement("a");
                link.textContent = "Show Video";
                link.href = "#";
                link.className = "show-video-link";
                link.addEventListener("click", function (e) {
                  e.preventDefault();
                  const modal = document.querySelector(".modal-event");
                  showModal(
                    modal,
                    `<iframe width="560" height="315" src="${story.video}" frameborder="0" allowfullscreen></iframe>`
                  );
                });
                storyPopUp.appendChild(link);
              }

              if (Array.isArray(story.resources)) {
                story.resources.forEach((resObj) => {
                  const res = document.createElement("a");
                  res.innerHTML = `🔗 ${resObj.label || "🔗 Related Resource"}`;
                  res.href = resObj.url;
                  res.target = "_blank";
                  res.className = "resource-link";
                  storyPopUp.appendChild(res);
                });
              } else if (story.resources) {
                const res = document.createElement("a");
                res.innerHTML = `🔗 Related Resource`;
                res.href = story.resources;
                res.target = "_blank";
                res.className = "resource-link";
                storyPopUp.appendChild(res);
              }

              storyPopUp.appendChild(document.createElement("hr"));
            });
          });
        }
      }, 300);
    });
  });
});
