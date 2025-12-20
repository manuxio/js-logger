export function topicAllowed(topic, filter) {
    if (!filter)
        return true;
    if (filter.deny && filter.deny.includes(topic))
        return false;
    if (filter.allow && filter.allow.length > 0)
        return filter.allow.includes(topic);
    return true;
}
