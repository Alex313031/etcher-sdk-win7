export declare class Speedometer {
    private windowSize;
    private values;
    constructor(windowSize?: number);
    private now;
    private removeOldValues;
    private moment;
    private value;
    speed(amount: number): number;
}
