function showVideoTutorial(event) {
  $.magnificPopup.open({
    items: {
      src: "#VideoTutorial-Block",
      type: "inline",
    },
    midClick: true,
    mainClass: "mfp-with-anim",
    callbacks: {
      open: function () {
        // Ensure the content is centered in the viewport
        $(".mfp-wrap").css({
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });
      },
    },
  });
}

$(document).ready(function () {
  // Show the welcome popup when the page loads
  $.magnificPopup.open({
    items: {
      src: "#Welcome-Block",
      type: "inline",
    },
    midClick: true,
    mainClass: "mfp-with-anim",
    callbacks: {
      open: function () {
        // Show the blur overlay
        $("#blur-overlay").show();

        // Center the content in the viewport
        $(".mfp-wrap").css({
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });
      },
      close: function () {
        // Hide the blur overlay when the modal is closed
        $("#blur-overlay").hide();
      },
    },
  });

  // "Get Started" replaces popup content
  $("#GetStarted-Btn").click(function () {
    $("#popup-content").html($("#VideoTutorial-Block").html());
  });

  // "Skip Tutorial" closes the popup
  $("#SkipTutorial-Btn").click(function () {
    $.magnificPopup.close();
  });
});
