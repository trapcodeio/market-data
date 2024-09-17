import { CronTime } from "cron-time-generator";

export default [
    {
        job: "update-prices",
        schedule: CronTime.every(1).minutes()
    }
];
