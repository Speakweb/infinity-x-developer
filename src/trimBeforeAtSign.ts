export function TrimBeforeAtSign(input: string): string {
    const atSignIndex = input.indexOf("@");

    if (atSignIndex !== -1) {
        return input.substring(atSignIndex);
    }

    return input;
}