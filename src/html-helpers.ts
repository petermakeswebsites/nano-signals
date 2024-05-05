
export function button(name : string, onclick : (e : MouseEvent) => void) {
    const button = document.createElement("button");
    button.onclick = onclick
    button.innerText = name
    return button
}
