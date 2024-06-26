"use strict";

const EARLIEST_VALID_DATE = -8640000000000000n;

const MS_PER_SEC = 1000;
const SEC_PER_MIN = 60;
const MIN_PER_HR = 60;
const HR_PER_DAY = 24;
const SEC_PER_DAY = SEC_PER_MIN * MIN_PER_HR * HR_PER_DAY;
const DAYS_PER_YR = 365.2425;
const MS_PER_YR = MS_PER_SEC * SEC_PER_DAY * DAYS_PER_YR;

import { intervalToDuration, Duration, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, formatDuration, addDays, yearsToDays, Interval } from "date-fns";

/*
BigInt absolute value
*/
function abs(n: bigint) {
    return (n < 0n ? -n : n);
}

/*
    JavaScript Date objects do not allow us to go back to the beginning of the universe.
    Thus, I will do it myself.
*/
class MyDate {
    /*
    Represents the number of milliseconds since the epoch (same as Date, or 1970-01-01 midnight UTC).
    Can store a better range of values than vanilla Date can.
    */
    #ms: bigint;
    constructor(ms: bigint) {
        this.#ms = ms;
    }

    /*
    Converts a MyDate to an ordinary Date.
    Throws RangeError if the date is out of range.
    */
    toDate(): Date {
        if (abs(this.#ms) > abs(EARLIEST_VALID_DATE)) {
            throw(RangeError("Attempted to call toDate on date outside of safe range (kind 1)"));
        }
        const ms = Number(this.#ms);
        const date = new Date(ms);
        if (date.toString() === "Invalid Date") { // date was outside range
            throw(RangeError("Attempted to call toDate on date outside of safe range (kind 2)"));
        } else {
            return date;
        }
    }

    /*
    Converts an ordinary Date to a MyDate.
    Call as MyDate.fromDate(d).
    */
    static fromDate(d: Date) : MyDate {
        return new MyDate(BigInt(d.getTime()));
    }

    static msBetween(d1: MyDate, d2: MyDate) : bigint {
        return d2.#ms - d1.#ms;
    }

    addMs(ms: bigint) {
        return new MyDate(this.#ms + ms);
    }

    /*
    toString
    TODO: will throw if toDate throws
    */
    toString() : string {
        try {
            return this.toDate().toString();
        } catch (e) {
            if (e instanceof RangeError) {
                return `MyDate with ${this.#ms} ms`;
            } else {
                throw(e);
            }
        }
    }
}

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
    document.getElementById("date")!.textContent = date.toString();
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
const startDate = new Date(Date.UTC(2024, 5, 22, 12, 57)); // June 22, 2024 12:57:00 UTC

const endDate = new Date(Date.UTC(2025, 0, 10, 0, 17)); // January 10, 2025 00:17:00 UTC

let lastInterval: NodeJS.Timeout | undefined;
let getNow = function() : Date {
    nowSlider.value = (new Date()).getTime().toString();
    return new Date;
};
const nowSlider = document.getElementById("set-now")! as HTMLInputElement;
nowSlider.min = startDate.getTime().toString();
nowSlider.max = endDate.getTime().toString();
nowSlider.value = (new Date()).getTime().toString();

(document.getElementById("use-set-now")! as HTMLInputElement).addEventListener("change", function() {
    if (this.checked) {
        getNow = () => new Date(Number(nowSlider.value));
        if (lastInterval) {
            clearInterval(lastInterval);
        }
        lastInterval = setInterval(() => nowSlider.value = (Number(nowSlider.value) + 100).toString(), 100);
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
        return `${Math.floor(num / 1000)},${(num % 1000).toString().padStart(3, '0')} years`;
    } else if (num < 1_000_000_000) {
        return `${num / 1_000_000} million years`;
    } else {
        return `${num / 1_000_000_000} billion years`;
    }
}

function update() {
    const now = getNow();

    // Calculate p, the percentage of the time that we have made it through so far
    // Assuming we are in the timeframe specified,
    // p is an ordinary number in [0, 1].
    const p = (now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());

    // Calculate T from the formula in the xkcd comic.
    // T is a positive value in years, according to the comic.
    const T = Math.exp(20.3444 * (p * p * p) + 3) - Math.exp(3);
    // Since years don't really make sense here, we convert this value to ms.
    //! TODO: won't this lose a lot of precision as written? do better
    // since T is a decimal
    const T_ms = BigInt(Math.round(T * DAYS_PER_YR * SEC_PER_DAY * MS_PER_SEC));

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
    updateEarthImage(T);

    requestAnimationFrame(update);
}

requestAnimationFrame(update);