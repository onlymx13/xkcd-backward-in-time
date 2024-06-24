"use strict";

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
        if (abs(this.#ms) > Number.MAX_SAFE_INTEGER) {
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
        const newMyDate = new MyDate(0n);
        newMyDate.#ms = BigInt(d.getTime());
        return newMyDate;
    }

    static msBetween(d1: MyDate, d2: MyDate) : bigint {
        return d2.#ms - d1.#ms;
    }
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
// T is a positive value in years.
const T = Math.exp(20.3444 * (p * p * p) + 3) - Math.exp(3);

console.log(
`
    start: ${startDate}
    end: ${endDate}
    now: ${now}
    p = ${p}
    T = ${T}
    curr = ${add(now, {years: -T})}
`);