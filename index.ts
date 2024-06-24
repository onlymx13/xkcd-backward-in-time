"use strict";

const EARLIEST_VALID_DATE = -8640000000000000n;

const MS_PER_SEC = 1000;
const SEC_PER_MIN = 60;
const MIN_PER_HR = 60;
const HR_PER_DAY = 24;
const SEC_PER_DAY = SEC_PER_MIN * MIN_PER_HR * HR_PER_DAY;
const DAYS_PER_YR = 365.2425;

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

function updateHtmlFromValues(ms: bigint): void {
    const remainingDaysElement = document.getElementById("remaining-days")!;
    const remainingHoursElement = document.getElementById("remaining-hours")!;
    const remainingMinutesElement = document.getElementById("remaining-minutes")!;
    const remainingSecondsElement = document.getElementById("remaining-seconds")!;

    dateFns.intervalToDuration({
        start: new Date(1929, 0, 15, 12, 0, 0),
        end: new Date(1968, 3, 4, 19, 5, 0)
      })

}

const startDate = MyDate.fromDate(new Date(Date.UTC(2024, 5, 22, 12, 57))); // June 22, 2024 12:57:00 UTC

const endDate = MyDate.fromDate(new Date(Date.UTC(2025, 0, 10, 0, 17))); // January 10, 2024 00:17:00 UTC

const now = MyDate.fromDate(new Date());

const big = Number.MAX_SAFE_INTEGER;
// Calculate p, the percentage of the time that we have made it through so far
// Assuming we are in the timeframe specified,
// p is an ordinary number in [0, 1].
const p = Number(MyDate.msBetween(startDate, now) * BigInt(big) / MyDate.msBetween(startDate, endDate)) / big;

// Calculate T from the formula in the xkcd comic.
// T is a positive value in years, according to the comic.
const T = Math.exp(20.3444 * (p * p * p) + 3) - Math.exp(3);
// Since years don't really make sense here, we convert this value to ms.
const T_ms = BigInt(Math.round(T * DAYS_PER_YR * SEC_PER_DAY * MS_PER_SEC));

console.log(
`
    start: ${startDate}
    end: ${endDate}
    now: ${now}
    p = ${p}
    T = ${T} years
      = ${T_ms} ms
    curr = ${now.addMs(-T_ms)}
`);
