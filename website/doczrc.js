export default {
    title: 'Nodal',
    files: 'src/docs/**/*.{md,markdown,mdx}',
    propsParser: false,
    menu: [
      {
        name: 'Guides',
        menu: [
          'Introduction',
          'Getting started',
          'Architecture',
          'Further reading',
        ],
      },
      {
        name: 'Examples',
        menu: [
          'Showcase',
          'Organic',
          'Hierarchical',
          'Compgraph',
          'Metro',
        ],
      },
      'API',
    ]
  }