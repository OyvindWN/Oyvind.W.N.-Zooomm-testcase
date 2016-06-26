
/*
	Author: Øyvind Wien Nicolaysen
	Last edited: 26th june, 2016	
*/

$(function () {
    //Array keeps track of ongoing ajax calls
    var webServiceCalls = [];

    $("document").ready(function () {
        bindButtonFunctions();
        getChannels(); //runs once and triggers channel view
        windowResizeManager();

    })

    function bindButtonFunctions() {

        $("#desktopWrapper")
            .on("click", ".desktopMenuButton", function () {
                if ($(this).attr("id") === "activeChannel") {
                    return;
                }
                changeChannel(this);
            })

        $("#mobileWrapper")
            //Open & closing the mobile menu
            .on("click", "#mobileChannelTitle", function () {
                if ($("#mobileChannelList").is(":visible")) { closeMobileMenu(); }
                else { openMobileMenu(); }
            })
            //Clicking a mobile channel
            .on("click", "#mobileChannelList div", function () {
                //set banner image
                changeChannel(this);
            })



        $(document).on("click", function (e) {
            //Closes mobile menu on clicks outside the dropdown list.
            if ($("#mobileChannelList").is(":visible") &&
                $(e.target).closest("#mobileChannelList, #mobileChannelTitle").length === 0) {
                closeMobileMenu()
            }
        })

        function closeMobileMenu() {
            $("#mobileChannelTitle").removeClass('active');
            $("#mobileChannelList").slideUp(300);
        }

        function openMobileMenu() {
            $("#mobileChannelTitle").addClass('active');
            $("#mobileChannelList").slideDown(300);
        }
    }

    function getChannels() {
        //After collecting the channeldata, send the data to the createChannel function, then trigger
        $.ajax({
            type: 'GET',
            url: "https://ws.zooom.no/v1/channels",
            contentType: "application/json",
            dataType: 'jsonp',
            success: function (data) {
                createChannelMenu(data);
                $(".desktopMenuButton").eq(0).trigger("click"); //Innitiates page
            },
            error: function (e) { }
        });
    };
     
    function createChannelMenu(obj) {
        //Takes an object from the webservice (https://ws.zooom.no/v1/channels) and makes a menu

        if (typeof (obj.items) === 'undefined') { return }

        for (var item in obj.items) {
            //Create desktop menu
            var htmlDesktopMenuButton = document.createElement("div");
            $(htmlDesktopMenuButton)
                .addClass("desktopMenuButton")
                .attr("data-channel-safename", obj.items[item].channel.urlSafeName)
                .attr("data-channel-name", obj.items[item].channel.name)
                .attr("data-banner-image", obj.items[item].cover_image)

            var htmlContent = "";
            htmlContent +=
                    "<p>" + obj.items[item].channel.name + "</p>"

            $(htmlDesktopMenuButton).css("background-image", "url(" + obj.items[item].cover_image + ")")
            $(htmlDesktopMenuButton).append(htmlContent)
            $("#desktopChannels").append(htmlDesktopMenuButton);


            //Create mobile menu
            var htmlMobileMenu = "";
            htmlMobileMenu +=
                    "<div " +
                    "data-channel-safeName='" + obj.items[item].channel.urlSafeName + "'" +
                    "data-channel-name='" + obj.items[item].channel.name + "'" +
                    "data-banner-image='" + obj.items[item].cover_image + "'" +
                    ">" + obj.items[item].channel.name + "</div>"

            document.getElementById("mobileChannelList").insertAdjacentHTML('beforeend', htmlMobileMenu);
        }

        //Sets menu button width based on amount in object
        $(".desktopMenuButton").width(100 / $(".desktopMenuButton").length + "%")

    }

    function changeChannel(elem) {
        //manages changes to the page when user clicks a menu item

        // Abort previous ajax calls to avoid overlapping timeline dressing.
        for (var c in webServiceCalls) { webServiceCalls[c].abort(); }
        webServiceCalls = []


        //Clear timelineContent to prepare for new channel content
        $("#timelineTarget").prevAll().remove();

        //starts ajax for channels, which gets and triggers timeline dressing
        procureTimeline($(elem).attr("data-channel-safename"));


        //DESKTOP visuals
        $("#desktopWrapper #activeChannel").attr("id", "");
        $("#desktopWrapper")
            .find("[data-channel-safename='" + $(elem).attr("data-channel-safename") + "']")
            .attr("id", "activeChannel")


        //MOBILE visuals
        //Set title and hide selected from menu 
        $("#mobileWrapper [data-channel-safename='" + $(elem).attr("data-channel-safename") + "']").hide().siblings().show();

        //Set channel title
        $("#mobileChannelTitle").text($(elem).attr("data-channel-name"));

        //sett channel image
        $("#mobileChannelBanner").css("background-image", "url(" + $(elem).attr("data-banner-image") + ")");

    }

    function procureTimeline(urlSafeName) {

        //Check for how many articles are presented, then add 10 more.
        var articlesToGet = 10;
        var articleOffset = $(".timeline-article").length;
        var url = "https://ws.zooom.no/v1/articles/" + urlSafeName + "?limit=" + articlesToGet + "&offset=" + articleOffset

        var serviceCall = $.ajax({
            type: 'GET',
            url: url,
            contentType: "application/json",
            dataType: 'jsonp',
            success: function (data) {

                if (!data.items) {
                    $("#timelineTarget").before("<h1 style='background:#e9f0ed';> Noe gikk galt med services, prøv igjen senere.</h1>")
                    return;
                }

                //Sort data object to ensure reverse-chronological order
                var epochTimes = [];
                var tempObj = {};

                for (var i = 0; i < data.items.length; i++) {
                    epochTimes.push(new Date(data.items[i].meta.created).getTime());
                    tempObj[epochTimes[i]] = data.items[i];
                }

                epochTimes.sort(function (a, b) { return a - b; }).reverse();

                for (var j = 0; j < epochTimes.length; j++) {
                    data.items[j] = tempObj[epochTimes[j]]
                }

                //Create a stringHtml object and parse it to #timelineContent
                var htmlToAdd = "";
                for (var i = 0; i < data.items.length; i++) {
                    $("#timelineTarget").before(createArticle(data.items[i]))
                }

                $(".timeline-article").fadeIn();

                setTimeout(function () {
                    $(window).trigger("resize");
                }, 150)

            },
            error: function (e) {

                if (e.statusText !== "abort") {
                    $("#timelineTarget").before("<h1 style='background:#e9f0ed';> Noe gikk galt med services, prøv igjen senere.</h1>")

                }

            }
        });

        //Store the request
        webServiceCalls.push(serviceCall);

    }

    function createArticle(item) {
        //Creates a timeline article from the webservice (https://ws.zooom.no/v1/articles/{urlSafeName}?limit=10&offset=0)

        var isEven = ($(".timeline-article").length % 2 > 0 ? true : false);
        var cleanDate = getTimestamp(item.meta.created, false);

        var articleItem = ("<div class='timeline-article " + (isEven ? "dRight" : "dLeft") + "'>" +
                    //article meta
                    "<div class='timelinePointWrapper'>" +
                        "<div class='timelinePoint " + cleanDate + ($("." + cleanDate).length ? " point" : " lead") + "'>" +
                        ($("." + cleanDate).length ? " " : getTimestamp(item.meta.created, true)) +
                        "</div>" +
                    "</div>" +
                    "<div class='timelineArrow'></div>" +
                    //article content
                    "<div class=timeline-articleContent>" +
                        "<img src='" + item.cover_image + "' />" +
                        "<h1>" + item.contents.title + "&nbsp;</h1>" +
                        "<div class='timestamp-ago' >" + getTimeAgo(item.meta.created) + "</div>" +
                        "<div class='timelinePreamble'>" +
                            item.contents.preamble +
                            "<a class='lesMer' target='_blank' href='https://www.zooom.no" + item.articleUrl + "'>Les mer</a>" +
                        "</div>" +
                    "</div>" +
                "</div>");
		return  articleItem;

        //Creates a readable timestamp based on time. 
        //Can return with and without html based on boolean "withHtml"
        function getTimestamp(created, withHtml) {
            var m_names = new Array("Jan", "Feb", "Mar",
            "Apr", "Mai", "Jun", "Jul", "Aug", "Sep",
            "Okt", "Nov", "Des");

            var d = new Date(created)

            var curr_date = d.getDate();
            var curr_month = d.getMonth();

            var dateHtml = (curr_date + "<br/> <span>" + m_names[curr_month] + "</span>");


            if (withHtml === true) {
                return (curr_date + "<br/> <span>" + m_names[curr_month] + "</span>");
            } else {
                return (curr_date + "-" + m_names[curr_month]);
            }

        }

        //Compares a date with the current date, and returns a string identifying the difference
        function getTimeAgo(dateString) {
            var date = new Date(dateString);
            if (!(date instanceof Date)) { return ""; }

            var seconds = Math.floor((new Date() - date) / 1000);
            var interval = Math.floor(seconds / 31536000);

            if (interval > 1) { return interval + " år siden"; }
            interval = Math.floor(seconds / 2592000);
            if (interval >= 1) { return interval + (interval >= 2 ? " måneder siden" : " måned siden"); }
            interval = Math.floor(seconds / 604800);
            if (interval >= 1) { return interval + (interval >= 2 ? " uker siden" : " uke siden"); }
            interval = Math.floor(seconds / 86400);
            if (interval >= 1) { return interval + (interval >= 2 ? " dager siden" : " dag siden"); }
            interval = Math.floor(seconds / 3600);
            if (interval >= 1) { return interval + (interval >= 2 ? " timer siden" : " time siden"); }
            interval = Math.floor(seconds / 60);
            if (interval >= 1) { return interval + (interval >= 2 ? " minutter siden" : " minutt siden"); }
            return " Nå nettopp";
        }
    }

    function windowResizeManager() {
        $(window).on("resize", function () {
            $("#timelineStreak").height($("#timeline").height() - 150)
        })

        $(window).scroll(function () {
            if ($(window).scrollTop() + $(window).height() === $(document).height()) {
                procureTimeline($("#activeChannel").attr("data-channel-safename"))
            }
        });
    }

})