import moment from "moment";
import Event from "../Models/Event";

const MAX_DAYS_IN_PAST = 31;

export const cutoffForOldEvents = moment().subtract(MAX_DAYS_IN_PAST, 'days');
export const eventIsRelevant = (event:Event):boolean => !!event.start?.isAfter(cutoffForOldEvents);