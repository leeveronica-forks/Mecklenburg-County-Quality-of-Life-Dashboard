// This is my general dumping ground for odds and ends that don't deservie their
// own JS file.

// Process the metric into useful stuff
function processMetric() {
    // clear metric data
    metricData.length = 0;

    // get the years available
    var keys = Object.keys(model.metric[0]);
    for (var i = 1; i < keys.length; i++) {
        metricData.push({"year": keys[i], "map": d3.map()});
    }

    // hide or show year related stuff
    if (keys.length > 2) {
        $(".temporal").show();
    } else {
        $(".temporal").hide();
    }

    // set slider and time related stuff
    $(".slider").slider("option", "max", metricData.length - 1);
    model.year = metricData.length -1;

    // set the data into d3 maps
    _.each(model.metric, function (d) {
        for (var i = 0; i < metricData.length; i++) {
            if ($.isNumeric(d[metricData[i].year])) { metricData[i].map.set(d.id, parseFloat(d[metricData[i].year])); }
        }
    });

    // Set up data extent
    var extentArray = [];
    _.each(metricData, function(d) { extentArray = extentArray.concat(d.map.values()); });
    x_extent = d3.extent(extentArray);

    // set up data quantile from extent
    quantize = d3.scale.quantile()
        .domain(x_extent)
        .range(d3.range(colorbreaks).map(function (i) {
            return "q" + i;
        }));
}

// push metric to GA and state
function recordMetricHistory() {
    // write metric viewed out to GA
    if (window.ga) {
        theMetric = $("#metric option:selected");
        ga('send', 'event', 'metric', theMetric.text().trim(), theMetric.parent().prop("label"));
    }
    if (history.pushState) {
        history.pushState({myTag: true}, null, "?m=" + $("#metric").val());
    }
}


// Hover highlights
// Node there's some weirdness with the geometry doing it this way, so there is
// another function like this specifically for after the geometry is added in
// map.js.
$(document).on({
    mouseenter: function(event){
        event.stopPropagation();
        addHighlight($(this));
    },
    mouseleave: function(event){
    event.stopPropagation();
        removeHighlight($(this));
    }
}, '.metric-hover');
function addHighlight(elem) {
    if (elem.attr('data-id')) {
        var theId = elem.attr('data-id');
        var theValue = $('.geom[data-id="' + theId + '"]').attr("data-value");
        d3.selectAll('[data-id="' + theId + '"]').classed("d3-highlight", true).transition().attr("r", 8);
        if ($.isNumeric(theValue)) {
            if(! elem.closest(".barchart-container").length ) { valueChart.pointerAdd(theId, theValue, ".value-hover"); }
        }
    }
    else {
        d3.selectAll('[data-quantile="' + elem.attr('data-quantile') + '"]').classed("d3-highlight", true);
    }
}
function removeHighlight(elem) {
    if (elem.data('id')) {
        var theId = elem.attr('data-id');
        d3.selectAll('[data-id="' + theId + '"]').classed("d3-highlight", false).transition().attr("r", 5);
        valueChart.pointerRemove(theId, ".value-hover");
    }
    else {
        d3.selectAll('[data-quantile="' + elem.data('quantile') + '"]').classed("d3-highlight", false);
    }
}

// Get a count in each quantile
function quantizeCount(data) {
    var q1 = _.countBy(data, function (d) {
        return quantize(d);
    });
    var q2 = [];
    for (var i = 0; i <= colorbreaks - 1; i++) {
        if (!q1["q" + i]) { q1["q" + i] = 0; }
        q2.push({
            "key": "q" + i,
            "value": q1["q" + i]
        });
    }
    return q2;
}

// create the table via lodash template
function drawTable() {
    var template = _.template($("script.template-table").html()),
        theSelected = _.filter(model.metric, function(el) { return model.selected.indexOf(el.id.toString()) !== -1; }),
        theAccuracy = _.filter(model.metricAccuracy, function(el) { return model.selected.indexOf(el.id.toString()) !== -1; }),
        theRaw = _.filter(model.metricRaw, function(el) { return model.selected.indexOf(el.id.toString()) !== -1; }),
        theRawAccuracy = _.filter(model.metricRawAccuracy, function(el) { return model.selected.indexOf(el.id.toString()) !== -1; }),
        keys = Object.keys(model.metric[0]);

    $(".datatable-container tbody").html(template({
        "theSelected": theSelected,
        "theAccuracy": theAccuracy,
        "theRaw": theRaw,
        "theRawAccuracy": theRawAccuracy,
        "keys": keys
    }));
}

// update stat boxes for selected stuff
function updateStats() {
    var m = $("#metric").val(),
        keys = Object.keys(model.metric[0]),
        theStat;

    // County Neighborhood Mean
    theStat = mean(model.metric);
    $(".stats-county-npa-mean").text(dataPretty(theStat[keys[model.year + 1]], m));

    // Selected Neighborhood Mean
    theStat = mean(_.filter(model.metric, function(el) { return model.selected.indexOf(el.id.toString()) !== -1; }));
    $(".stats-mean-selected").text(dataPretty(theStat[keys[model.year + 1]], m));

    // County Median
    theStat = median(_.map(model.metric, function(num){ if ($.isNumeric(num[keys[model.year + 1]])) { return Number(num.y_2012); } }));
    $(".stats-county-npa-median").text("Median: " + dataPretty(theStat, m));

    // selected weighted mean
    if (metricRaw[m]) {
        $(".stats-weighted").removeClass('hide');

        // county weighted mean
        theStat = weightedMean(model.metric, model.metricRaw);
        $(".stats-weighted-mean-county").text(dataPretty(theStat[keys[model.year + 1]], m));

        // selected weighted mean
        theStat = weightedMean(_.filter(model.metric, function(el) { return model.selected.indexOf(el.id.toString()) !== -1; }),
            _.filter(model.metricRaw, function(el) { return model.selected.indexOf(el.id.toString()) !== -1; }));
        $(".stats-weighted-mean-selected").text(dataPretty(theStat[keys[model.year + 1]], m));
    } else {
        $(".stats-weighted").addClass('hide');
    }
}
