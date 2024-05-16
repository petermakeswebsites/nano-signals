import cytoscape from 'cytoscape'

export function pop(node: cytoscape.CollectionReturnValue) {
    if (node.animated()) return
    node.animate({
        style: {
            'background-color': '#eee', // Bright red color for emphasis
            width: '80px', // Larger size to make the node pop
            height: '80px',
        },
        duration: 100,
    })
        .delay(50)
        .animate(
            {
                style: {
                    width: '25px', // Reset to default by removing the style
                    height: '25px', // Reset to default by removing the style
                },
                duration: 100,
            },
            {
                // Callback to completely remove the inline styles after animation
                complete: function () {
                    node.removeStyle() // Removes all inline styles and reverts to stylesheet
                },
            },
        )
}
