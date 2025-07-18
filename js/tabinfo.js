document.addEventListener("DOMContentLoaded", function () {
  const tabInfoModal = new bootstrap.Modal(
    document.getElementById("tabInfoModal")
  );
  const tabInfoTitle = document.getElementById("tabInfoTitle");
  const tabInfoBody = document.getElementById("tabInfoBody");
  const dontShowTabInfoCheckbox = document.getElementById(
    "Info-checkbox-remove"
  );
  const closeTabInfoBtn = document.getElementById("CloseTabInfoBtn");

  // Ensure the checkbox container exists
  const checkboxContainer = dontShowTabInfoCheckbox.closest(".form-check");

  // Image container setup
  const tabInfoImageContainer = document.createElement("div");
  tabInfoImageContainer.id = "tabInfoImageContainer";
  tabInfoImageContainer.style =
    "display: none; text-align: center; margin-top: 10px;";

  const tabInfoImage = document.createElement("img");
  tabInfoImage.id = "tabInfoImage";
  tabInfoImage.style = "max-width: 100%; height: auto;";

  tabInfoImageContainer.appendChild(tabInfoImage);
  tabInfoBody.insertAdjacentElement("afterend", tabInfoImageContainer);

  // Tab descriptions with images
  const tabDescriptions = {
    "animation-tab": {
      title: "Historical Overview",
      description: `Explore key events and land acquisitions over time through maps and historical narratives.

. 
      <ul class="highlight-box">
        <b>Territorial expansion:</b> See the acquisition of lands over time as well as changes from territories to statehood.<br>
        <b>Indegenous Lands:</b> Explore native lands and tribes.<br>
      </ul>`,
      image: "",
    },
    "population-tab": {
      title: "Population Patterns",
      description: `Explore population density and demographic changes over time. 
        <ul class="highlight-box">
          <b>Population Density:</b> See how people are spread across different areas.<br>
          <b>Racial Composition:</b> Explore the percentage distribution of racial groups.<br>
          <b>Demographic Trends:</b> Track changes in population patterns over time.
        </ul>`,
      image: "img/pop.png",
    },
    "migration-tab": {
      title: "Internal Migration",
      description: `Explore <b>internal migration</b> of families using family tree data and examine <b>net migration flows</b> across different states. 
    <ul class="highlight-box">
      <b>Positive Net Flow Ratio:</b> More people are <b>moving in</b> than leaving.<br>
      <b>Negative Net Flow Ratio:</b> More people are <b>leaving</b> than coming in.
    </ul>`,
      image: "img/netflowratio.png",
    },

    "immigration-tab": {
      title: "Immigration Trends",
      description: `Discover where immigrants came from and where they settled, visualizing the connections between sending and receiving regions. 
        <ul class="highlight-box">
          <b>Origins of Immigrants:</b> Examine the countries and regions where immigrants originated.</li><br>
          <b>Destinations of Immigrants:</b> Identify key destinations and how different immigrant groups have influenced local demographics.</li>
        </ul>`,
      image: "",
    },
    "compare-tab": {
      title: "Data Comparison",
      description: `Compare two datasets side by side to uncover patterns in migration and population changes.
 
        <ul class="highlight-box">
          <b>Population density:</b> Compare maps with changes in population per area over time</li><br>
          <b>Internal migration:</b> Explore migration maps over time using side-by-side comparison.<br>
          <b>Foreign Born:</b> Explore Foreign born population over time.<br>

        </ul>`,
      image: "",
    },
  };

  let currentTabId = "animation-tab";

  // Function to show tab modal with optional image
  function showTabInfo(tabId) {
    currentTabId = tabId;

    if (
      tabDescriptions[tabId] &&
      !sessionStorage.getItem(`hideTabInfoModal-${tabId}`)
    ) {
      tabInfoTitle.textContent = tabDescriptions[tabId].title;
      tabInfoBody.innerHTML = tabDescriptions[tabId].description;

      // Ensure checkbox is visible for tab modals
      if (checkboxContainer) checkboxContainer.style.display = "block";

      // Show image if available
      if (tabDescriptions[tabId].image) {
        tabInfoImage.src = tabDescriptions[tabId].image;
        tabInfoImage.alt = tabDescriptions[tabId].title;
        tabInfoImageContainer.style.display = "block";
      } else {
        tabInfoImageContainer.style.display = "none";
      }

      dontShowTabInfoCheckbox.checked = !!sessionStorage.getItem(
        `hideTabInfoModal-${tabId}`
      );
      tabInfoModal.show();
    }
  }

  // Function to show info modal for info icons
  window.showInfoModal = function (title, description, imageUrl = "") {
    tabInfoTitle.textContent = title;
    tabInfoBody.innerHTML = description;

    if (checkboxContainer) {
      checkboxContainer.style.display = "none";
    }

    if (imageUrl) {
      tabInfoImage.src = imageUrl;
      tabInfoImage.alt = title;
      tabInfoImageContainer.style.display = "block";
    } else {
      tabInfoImageContainer.style.display = "none";
    }

    tabInfoModal.show();
  };

  document.addEventListener("click", function (event) {
    if (event.target.closest("#populationDensityInfo2")) {
      event.preventDefault();
      console.log("Clicked on populationDensityInfo2!");

      if (typeof showInfoModal === "function") {
        showInfoModal(
          "Population Density (per Sq. km)",
          `Population Density represents the number of people living per square kilometer.
        <p class="highlight-box">
         <b> N.B:</b> The first official census US census was conducted in 1790. Data before the official Census is limited.
        </p>`,
          "img/pop.png"
        );
      } else {
        console.error("showInfoModal is not defined or not accessible.");
      }
    }
  });

  // Store user preference when checking "Don't Show Again"
  dontShowTabInfoCheckbox.addEventListener("change", function () {
    if (this.checked) {
      sessionStorage.setItem(`hideTabInfoModal-${currentTabId}`, "true");
    } else {
      sessionStorage.removeItem(`hideTabInfoModal-${currentTabId}`);
    }
  });

  // Attach event listeners for tab clicks
  document.querySelectorAll(".nav-link").forEach((tab) => {
    tab.addEventListener("click", function () {
      showTabInfo(this.id);
    });
  });

  // Attach event listeners for info icons

  // Attach event listeners for info icons
  document
    .getElementById("immigrationStateInfo")
    .addEventListener("click", function (event) {
      event.preventDefault();
      showInfoModal(
        "Immigration by State",
        `Explore where immigrants to the United States came from and how they settled across different regions over time.
      <ul class="highlight-box">
        <b>Origins of Immigrants:</b> Visualize immigration by continent or country of origin, depending on the level of detail available in each decade's census data.<br>
        <b>Destinations:</b> See how immigrant populations were distributed across U.S. states and territories.<br>
        <b>Historical U.S. Boundaries:</b> The map reflects state and territorial boundaries as they existed in each decade, not modern state lines.<br>
        <b>Data Limitations:</b> Some census years are based on sample data, not full population counts. Interpret patterns with these historical limitations in mind.<br>
      </ul>`,
        "" // Optional image or illustration
      );
    });

  document
    .getElementById("netFlowInfo")
    .addEventListener("click", function (event) {
      event.preventDefault();
      showInfoModal(
        "Net Flow Ratio",
        `The <b>Net Flow Ratio</b> measures migration balance in a given area.
      <ul class="highlight-box">
        <b>Positive Net Flow Ratio:</b> More people are <b>moving in</b> than leaving.<br>
        <b>Negative Net Flow Ratio:</b> More people are <b>leaving</b> than coming in.<br>
      </ul>
      <b>Data Limitations:</b> Data reflects patterns from  census period and short-term fluctuations may not be captured. Some areas may have limited data accuracy and migration records are not available.`,
        "img/netflowratio.png"
      );
    });

  document
    .getElementById("populationDensityInfo")
    .addEventListener("click", function (event) {
      event.preventDefault();
      showInfoModal(
        "Population Density (per Sq. km)",
        "Population Density represents the number of people living per square kilometer.",

        "img/pop.png" // Attach the image
      );
    });

  // Close tab info modal when the close button is clicked
  closeTabInfoBtn.addEventListener("click", function () {
    tabInfoModal.hide();
  });

  // 🚀 Attach event listener for "Get Started" to open video modal
  document
    .getElementById("GetStarted-Btn")
    .addEventListener("click", function () {
      $.magnificPopup.close(); // Close Welcome modal

      setTimeout(() => {
        // Open the video tutorial modal
        $.magnificPopup.open({
          items: {
            src: "#VideoTutorial-Block",
            type: "inline",
          },
          closeOnBgClick: false,
          showCloseBtn: true,
          callbacks: {
            close: function () {
              // Show History tab info after the video modal is closed
              setTimeout(() => {
                if (!sessionStorage.getItem("hideTabInfoModal-animation-tab")) {
                  showTabInfo("animation-tab");
                }
              }, 500);
            },
          },
        });
      }, 500); // Small delay for a smoother transition
    });

  function closeWelcomeAndShowHistory() {
    $.magnificPopup.close();

    setTimeout(() => {
      console.log("Checking session storage for animation-tab modal...");
      if (!sessionStorage.getItem("hideTabInfoModal-animation-tab")) {
        console.log("Showing the animation-tab modal now...");
        showTabInfo("animation-tab");
      } else {
        console.log("Animation tab modal is hidden per user preference.");
      }
    }, 500);
  }

  document
    .getElementById("SkipTutorial-Btn")
    .addEventListener("click", closeWelcomeAndShowHistory);
});
document.addEventListener("click", function (event) {
  if (event.target.closest("#populationDensityInfo2")) {
    event.preventDefault();

    // ✅ Ensure `showInfoModal()` exists before calling it
    if (typeof showInfoModal === "function") {
      showInfoModal(
        "Population Density (per Sq. km)",
        "Population Density represents the number of people living per square kilometer.",
        "img/pop.png" // Attach the image
      );
    } else {
      console.error("showInfoModal is not defined or not accessible.");
    }
  }
});
