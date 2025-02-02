"use strict";

import { intervalToDuration, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, formatDuration } from "date-fns";

import { MS_PER_SEC, SEC_PER_MIN, MIN_PER_HR, HR_PER_DAY, MS_PER_YEAR, MyDate } from "/src/mydate.ts";

function updateRemainingTime(days: number, hours: number, minutes: number, seconds: number): void {
    const remainingDaysElement = document.getElementById("remaining-days")!;
    const remainingHoursElement = document.getElementById("remaining-hours")!;
    const remainingMinutesElement = document.getElementById("remaining-minutes")!;
    const remainingSecondsElement = document.getElementById("remaining-seconds")!;

    remainingDaysElement.textContent = days.toString();
    remainingHoursElement.textContent = hours.toString();
    remainingMinutesElement.textContent = minutes.toString();
    remainingSecondsElement.textContent = seconds.toString();
}

function updateXkcdDate(date: MyDate): void {
    const dateDisplay = document.getElementById("date")!;
    if (date.toString().startsWith("MyDate")) {
        dateDisplay.hidden = true;
    } else {
        dateDisplay.textContent = date.toString();
        dateDisplay.hidden = false;
    }
}

function updateTimeAgo(timeAgo: string): void {
    document.getElementById("time-ago")!.textContent = timeAgo;
}

let lastClosestImage = -1; // TODO: cringe af

function mya_to_image_number(mya: number): number {
    if (mya >= 3600) {
        return 1 + (4540 - mya) / 0.5;
    } else {
        return mya_to_image_number(3600) + (3600 - mya) / 0.2;
    }
}

const NUM_CURR_EVENTS = 10;
async function updateCurrentEvents(now: Date, T_ms: bigint): Promise<void> {
    // Show current events within [now - 1.05 T, now - 0.95 T]
    const begin_ = MyDate.fromDate(now).addMs(-105n * T_ms / 100n);
    const end_ = MyDate.fromDate(now).addMs(-95n * T_ms / 100n);
    try {
        const begin = begin_.toDate();
        const end = end_.toDate();
        document.getElementById("current-events")!.hidden = false;

        // modified from https://www.reddit.com/r/datasets/comments/cho4lq/comment/ev2m9tz/
        const query = 
            `select distinct ?event ?date ?label ?article_en {
                ?event wdt:P31/wdt:P279* wd:Q1190554 .  # something that is a subtype of occurence
                ?event wdt:P585 ?time .   # and happened on date date (note this only takes events with a point of time, not with a start and end date)
                filter(?time > "${begin.toISOString()}"^^xsd:dateTime)  # and that date is after begin
                filter(?time < "${end.toISOString()}"^^xsd:dateTime)  # but before end
                ?event rdfs:label ?label .  # get the name
                filter(lang(?label) = 'en')  # but only the English one
                
                ?article_en schema:about ?event ; schema:isPartOf <https://en.wikipedia.org/> .  # only if it has a Wikipedia article
                ?article_ru schema:about ?event ; schema:isPartOf <https://ru.wikipedia.org/> .  # adding these leads to time outs for me, but can add more importance filter
                ?article_zh schema:about ?event ; schema:isPartOf <https://zh.wikipedia.org/> .
                ?article_ar schema:about ?event ; schema:isPartOf <https://ar.wikipedia.org/> .
            } limit ${NUM_CURR_EVENTS}  # to avoid timeout, I only ask for NUM_CURR_EVENTS`;
        //TODO this query times out sometimes
        fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`).then(response => response.json()).then(
            json => {
                const currEventsList = document.getElementById("current-events-list")! as HTMLUListElement;
                while (currEventsList.firstChild) {
                    currEventsList.removeChild(currEventsList.firstChild);
                }
                for (const event of json["results"]["bindings"]) {
                    const wikipedia_url = event["article_en"]["value"];

                    const li = document.createElement("li");
                    const p = document.createElement("p");
                    p.innerHTML = `${event["label"]["value"]} (<a href="${wikipedia_url}">Wikipedia)`;
                    const p2 = document.createElement("p");
                    p2.textContent = "Loading description...";
                    li.appendChild(p);
                    li.appendChild(p2);
                    currEventsList.appendChild(li);
                    const wikipedia_url_split = wikipedia_url.split("/wiki/");
                    const wikipedia_name = wikipedia_url_split[wikipedia_url_split.length - 1];
                    // Get an excerpt from the Wikipedia article
                    const api_url = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&origin=*&titles=${wikipedia_name}`;
                    fetch(api_url).then(response => response.json()).then(json => {
                        const pages = json["query"]["pages"];
                        // pages is an object with a single property. access it
                        p2.textContent = pages[Object.getOwnPropertyNames(pages)[0]]["extract"];
                    });
                }
            }
        ).catch(e => {
            // Ignore "Failed to fetch", it's fine
            // TODO try again in a bit
            if (!(e instanceof TypeError && e.message === "Failed to fetch")) {
                throw(e);
            }
        });
    } catch(e) {
        if (e instanceof RangeError) {
            // Dates are too far away to bother with current events at the moment
            document.getElementById("current-events")!.hidden = true;
            return;
        } else {
            throw(e);
        }
    }
}

function updateEarthImage(yearsAgo: number): void {
    const earthImage = document.getElementById("earth-image")! as HTMLImageElement;
    const mya = yearsAgo / 1_000_000;
    if (mya < 0.02) {
        // At 20,000 years ago, begin teasing the continents with the Earth image.
        // It won't actually change until 100,000 years ago.
        // Man, this is such a sick feature.
        lastClosestImage = -2;
        earthImage.src = "";
    } else if (mya > 4540) {
        if (lastClosestImage !== -2) {
            //TODO Handle the Earth not existing (idk show a picture of the solar system or smth)
            lastClosestImage = -2;
            earthImage.src = "";
            //throw(new RangeError("Tried to get image of an Earth that does not exist"));
        }
    } else {
        const desired_image_number = mya_to_image_number(mya);
        const nearest_legal_image = Math.round(desired_image_number); // find whichever image comes from the nearest time to our time

        if (nearest_legal_image !== lastClosestImage) {
            earthImage.src = `assets/earth_images/img${nearest_legal_image}.jpg`;
            lastClosestImage = nearest_legal_image;
        }
    }
}

const nowSlider = document.getElementById("set-now")! as HTMLInputElement;

//TODO give some kind of warning when endDate < startDate
let startDate: Date | undefined;
let endDate: Date | undefined;

if (localStorage.getItem("startDate")) {
    startDate = new Date(localStorage.getItem("startDate")!);
    (document.getElementById("start-date") as HTMLInputElement)!.value = localStorage.getItem("startDate")!;
}

document.getElementById("start-date")!.addEventListener("change", event => {
    const newStartDate = (event.target as HTMLInputElement).value;
    startDate = new Date(newStartDate);
    localStorage.setItem("startDate", newStartDate);
    nowSlider.min = startDate?.getTime().toString();
    nowSlider.value = (new Date()).getTime().toString();
});

if (localStorage.getItem("endDate")) {
    endDate = new Date(localStorage.getItem("endDate")!);
    (document.getElementById("end-date") as HTMLInputElement)!.value = localStorage.getItem("endDate")!;
}

document.getElementById("end-date")!.addEventListener("change", event => {
    const newEndDate = (event.target as HTMLInputElement).value;
    endDate = new Date(newEndDate);
    localStorage.setItem("endDate", newEndDate);
    nowSlider.max = endDate?.getTime().toString();
    nowSlider.value = (new Date()).getTime().toString();
});

if (startDate) nowSlider.min = startDate.getTime().toString();
if (endDate) nowSlider.max = endDate.getTime().toString();
nowSlider.value = (new Date()).getTime().toString();

//const startDate = new Date(Date.UTC(2024, 5, 22, 12, 57)); // June 22, 2024 12:57:00 UTC
//const endDate = new Date(Date.UTC(2025, 0, 10, 0, 17)); // January 10, 2025 00:17:00 UTC

let getNow = function() : Date {
    nowSlider.value = (new Date()).getTime().toString();
    return new Date;
};

let lastInterval: NodeJS.Timeout | undefined;
(document.getElementById("use-set-now")! as HTMLInputElement).addEventListener("change", function() {
    if (this.checked) {
        getNow = () => new Date(Number(nowSlider.value));
        if (lastInterval) {
            clearInterval(lastInterval);
        }
        lastInterval = setInterval(() => nowSlider.value = (Number(nowSlider.value) + 10).toString(), 10);
    } else {
        if (lastInterval) {
            clearInterval(lastInterval);
        }
        getNow = function() {
            nowSlider.value = (new Date()).getTime().toString();
            return new Date;
        }
    }
});

function formatNumberOfYears(num: number): string {
    if (num < 1_000) {
        return `${num} years`;
    } else if (num < 1_000_000) {
        // do in form XXX, XXX.XXXX... years ago
        // pad start with the proper number of zeroes
        const mod_1000 = num % 1000;
        return `${Math.floor(num / 1000)},${
            (mod_1000 < 10 ? "00" : (
                mod_1000 < 100 ? "0" : ""
            ))
        }${mod_1000} years`;
    } else if (num < 1_000_000_000) {
        return `${num / 1_000_000} million years`;
    } else {
        return `${num / 1_000_000_000} billion years`;
    }
}

// s: startDate.getTime(), f: endDate.getTime(), t: now.getTime(), p: p from The Formula
function updateDerivative(s: number, f: number, t: number, p: number) {
    const element = document.getElementById("derivative")!;
    const derivative = 1225.88 * (t - s) * (t - s) * Math.exp(-(20.3444 * (s - t) * (s - t) * (s - t)) / ((f - s) * (f - s) * (f - s))) / ((f - s) * (f - s) * (f - s));
    element.textContent = `Derivative: ${derivative * MS_PER_YEAR - 1}`; // subtracting one to make it from current time, rather than of time ago
}

let currEventsLastUpdated = (new Date(0)).getTime();; // a long time ago

function update() {
    if (startDate === undefined || endDate === undefined) {
        // User has not selected both dates yet.
        // We can't do anything, because there is no math to do.
        document.getElementById("left-side-wrapper")!.hidden = true;
        document.getElementById("current-events")!.hidden = true;
    } else {
        document.getElementById("left-side-wrapper")!.hidden = false;
        document.getElementById("current-events")!.hidden = false;
        const now = getNow();

        // Calculate p, the percentage of the time that we have made it through so far
        // Assuming we are in the timeframe specified,
        // p is an ordinary number in [0, 1].
        const p = (now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());

        // Calculate T from the formula in the xkcd comic.
        // T is a positive value in years, according to the comic.
        const T = Math.exp(20.3444 * (p * p * p) + 3) - Math.exp(3);
        // Since years don't really make sense here, we convert this value to ms.
        // Try to avoid floating-point imprecision by considering the integer and fractional
        // parts of T separately. Use BigInt arithmetic for the integer parts.
        //TODO is this necessary?
        const T_integer = Math.floor(T);
        const T_frac = T % 1;
        const T_ms_int = BigInt(T_integer) * BigInt(MS_PER_YEAR);
        const T_ms_frac = T_frac * MS_PER_YEAR;
        const T_ms = T_ms_int + BigInt(Math.round(T_ms_frac));

        const xkcdDate = MyDate.fromDate(now).addMs(-T_ms);

        /*
        console.log(
        `
            start: ${startDate}
            end: ${endDate}
            now: ${now}
            p = ${p}
            T = ${T} years
            = ${T_ms} ms
            curr = ${xkcdDate}
        `);
        */

        const days = differenceInDays(endDate, now);
        const hours = differenceInHours(endDate, now) % HR_PER_DAY; // TODO if there is DST going on this fucks shit up, see docs for differenceInFullDays
        const minutes = differenceInMinutes(endDate, now) % MIN_PER_HR;
        const seconds = differenceInSeconds(endDate, now) % SEC_PER_MIN;

        /*
        Calculate the display that shows how long ago the xkcd date is, relative to now.
        */
        let timeAgo: string;
        try {
            timeAgo = `${formatDuration(intervalToDuration({
                start: xkcdDate.toDate(),
                end: now
            }))} ${(now.getTime() - xkcdDate.toDate().getTime()) % 1000} milliseconds ago`;
        } catch(e) {
            if (e instanceof RangeError) {
                // date is too long ago to use ordinary Dates
                timeAgo = `${formatNumberOfYears(T)} ago`;
            } else {
                throw(e);
            }
        }

        updateRemainingTime(days, hours, minutes, seconds);
        updateXkcdDate(xkcdDate);
        updateTimeAgo(timeAgo);
        updateDerivative(startDate.getTime(), endDate.getTime(), now.getTime(), p);
        const realNow = (new Date).getTime();
        if ((realNow - currEventsLastUpdated) > MS_PER_SEC * SEC_PER_MIN * 5) { // Every 5 minutes
            currEventsLastUpdated = realNow;
            updateCurrentEvents(now, T_ms);
        }
        updateEarthImage(T);
}

    requestAnimationFrame(update);
}

requestAnimationFrame(update);