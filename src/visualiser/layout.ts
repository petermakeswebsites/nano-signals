import cytoscape from 'cytoscape'

export const cytoLayout: cytoscape.LayoutOptions = {
    name: 'concentric',
    concentric: function (node) {
        // @ts-ignore
        return node.data('level')
    },
    levelWidth: function (_) {
        return 5 // You can experiment with this value
    },
    minNodeSpacing: 70,
    spacingFactor: 1.5,
    fit: true, // Turn off automatic fitting
    padding: 30,
    animate: true,
    animationDuration: 500,
}
