/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.org/docs/gatsby-config/
 */

module.exports = {
  /* Your site config here */
  siteMetadata: require("./site-meta-data.json"),
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `markdown-pages`,
        path: `${__dirname}/_data`,
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [{
          resolve: `gatsby-remark-prismjs`,
          options: {
            classPrefix: "language-",
            inlineCodeMarker: null,
            aliases: {},
            showLineNumbers: false,
            noInlineHighlight: false,
          },
        },
        {
          resolve: `gatsby-remark-images`,
          options: {
            // It's important to specify the maxWidth (in pixels) of
            // the content container as this plugin uses this as the
            // base for generating different widths of each image.
            maxWidth: 590,
          },
        },
        {
          resolve: `gatsby-remark-image-attributes`,
          options: {

            // ?Boolean=true
            //   If true (the default), all CSS
            //   property names will be recognized
            //   as styleAttribute.
            styleAttributes: true,

            // ?Boolean=false
            //   If true, all attributes that
            //   aren't styleAttributes, will be
            //   added as data-* attributes to the
            //   image.
            dataAttributes: false
          }
        },
        {
          resolve: 'gatsby-remark-emojis',
        },
      ],
      },
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        // The property ID; the tracking code won't be generated without it. replace with yours
        trackingId: "UA-164743872-1",
        head: true,
      }
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Delog GatbsyJS Starter`,
        short_name: `Delog`,
        start_url: `/`,
        background_color: `#fff`,
        theme_color: `#381696`,
        display: `standalone`,
        icon: "src/images/icon.png",
      },
    },
    `gatsby-plugin-sass`, 
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-netlify-cms`,
    'gatsby-plugin-dark-mode',
    // siteURL is a must for sitemap generation
    `gatsby-plugin-sitemap`,
    `gatsby-plugin-offline`,
    `gatsby-image`,
    `gatsby-transformer-sharp`, 
    `gatsby-plugin-sharp`,
    {
      resolve: "gatsby-plugin-social-cards",
      options: {
        // ommit to skip
        authorImage: "./static/assets/me.png",
        // image to use when no cover in frontmatter
        backgroundImage: "./static/img/hvitserkur.JPG",
        // author to use when no auth in frontmatter
        defaultAuthor: "Andri Óskarsson",
        // card design
        design: "default", // 'default' or 'card'
      },
    },
  ],
}
