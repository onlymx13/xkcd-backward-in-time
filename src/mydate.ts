"use strict";

const EARLIEST_VALID_DATE = -8640000000000000n;

export const MS_PER_SEC = 1000;
export const SEC_PER_MIN = 60;
export const MIN_PER_HR = 60;
export const HR_PER_DAY = 24;
const SEC_PER_DAY = SEC_PER_MIN * MIN_PER_HR * HR_PER_DAY;
const DAYS_PER_YR = 365.2425;
export const MS_PER_YEAR = MS_PER_SEC * SEC_PER_DAY * DAYS_PER_YR;

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
export class MyDate {
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
    will throw if toDate throws
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
