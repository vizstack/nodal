import React from "react";
import classNames from "classnames";

// @material-ui/core components
import withStyles from "@material-ui/core/styles/withStyles";

// @material-ui/icons

// Syntax highlighter
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import prism from 'react-syntax-highlighter/dist/esm/styles/prism/prism';
import tomorrow from 'react-syntax-highlighter/dist/esm/styles/prism/tomorrow';

// Core components
import Header from "components/Header/Header.jsx";
import Footer from "components/Footer/Footer.jsx";
import GridContainer from "components/Grid/GridContainer.jsx";
import GridItem from "components/Grid/GridItem.jsx";
import HeaderLinks from "components/Header/HeaderLinks.jsx";
import Parallax from "components/Parallax/Parallax.jsx";

import { container, title } from "assets/jss/material-kit-react.jsx";

// Sections for this page
import PrinciplesSection from "./sections/PrinciplesSection.jsx";
import TeamSection from "./sections/TeamSection.jsx";

SyntaxHighlighter.registerLanguage('jsx', jsx);

const dashboardRoutes = [];

class LandingPage extends React.Component {
  render() {
    const { classes, ...rest } = this.props;
    return (
      <div>
        <Header
          color="transparent"
          routes={dashboardRoutes}
          brand="nodal.js"
          rightLinks={<HeaderLinks />}
          fixed
          changeColorOnScroll={{
            height: 100,
            color: "white"
          }}
          {...rest}
        />
        <Parallax image={require("assets/img/landing-bg.jpg")}>
          <div className={classes.container}>
            <GridContainer>
              <GridItem xs={12} sm={8} md={6}>
                <h2 className={classes.title}>
                  A powerful <br/>
                  open-source library <br/>
                  for graph layout.
                </h2>
                <h4>
                  Start building beautiful graphs immediately, <br/>
                  or configure your own algorithm for any use case.
                </h4>
                <br />
                  <div className={classes.codebox}>
                    {"npm install nodal"}
                  </div>
                  
              </GridItem>
            </GridContainer>
          </div>
        </Parallax>
        <div className={classNames(classes.main, classes.mainRaised)}>
          <div className={classes.container}>
            <PrinciplesSection />
            <iframe
              src="storybook/?path=/story/force-models--spring-w-simple-nodes"
              style={{ width: '100%', height: '100vh' }} />
            <TeamSection />
          </div>
        </div>
        <Footer />
      </div>
    );
  }
}

const styles = {
  container: {
    zIndex: "12",
    // color: "#FFFFFF",  // If photo background, make white.
    ...container
  },
  title: {
    ...title,
    display: "inline-block",
    position: "relative",
    marginTop: "30px",
    minHeight: "32px",
    textDecoration: "none"
  },
  subtitle: {
    fontSize: "1.313rem",
    maxWidth: "500px",
    margin: "10px auto 0"
  },
  main: {
    background: "#FFFFFF",
    position: "relative",
    zIndex: "3"
  },
  mainRaised: {
    margin: "-60px 20px 0px",
    borderRadius: "6px",
    boxShadow:
      "0 16px 24px 2px rgba(0, 0, 0, 0.14), 0 6px 30px 5px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(0, 0, 0, 0.2)"
  },
  codebox: {
    borderRadius: 4,
    userSelect: 'all',
    background: 'rgba(213, 218, 231, 0.5) !important',
    padding: 16,
    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
  }
};

export default withStyles(styles)(LandingPage);
