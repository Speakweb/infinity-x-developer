function trimGraves(input: string): string {
    const grave = '`'; // the grave accent character
    let start = 0;
    let end = input.length;

    while (input[start] === grave) {
        start++;
    }

    while (input[end - 1] === grave) {
        end--;
    }

    return input.substring(start, end);
}