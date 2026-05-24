export class TheEdgeTokenDocument extends TokenDocument {
    getBarAttribute(barName, options) {
        const alternative = options?.alternative;
        const data = super.getBarAttribute(barName, { alternative });
        const attr = alternative || this[barName]?.attribute;
        if (!data || !attr || !this.actor)
            return data;
        const current = foundry.utils.getProperty(this.actor.system, attr);
        data.max = current.max?.value || data.max;
        if (current?.dtype === "Resource")
            data.min = parseInt(current.min || 0);
        data.editable = true;
        return data;
    }
    static getTrackedAttributes(data, _path = []) {
        if (data || _path.length)
            return super.getTrackedAttributes(data, _path);
        return {
            // System paths to fields with value and max,
            bar: [["health"], ["strain"]],
            // System paths to fields with only a value
            value: []
        };
    }
}
export class TheEdgeToken extends foundry.canvas.placeables.Token {
    _drawBar(number, bar, data) {
        if ("min" in data) {
            // Copy the data to avoid mutating what the caller gave us.
            data = { ...data };
            // Shift the value and max by the min to draw the bar percentage accurately for a non-zero min
            data.value -= data.min;
            data.max -= data.min;
        }
        return super._drawBar(number, bar, data);
    }
}
