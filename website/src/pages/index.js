import React from "react";
import {createMemoryHistory} from "history";
import {Route, BrowserRouter, Switch} from "react-router-dom";

import "assets/scss/material-kit-react.scss?v=1.4.0";
import 'typeface-roboto';
import 'typeface-roboto-slab';

// Pages of the website.
import LandingPage from "./LandingPage/LandingPage.jsx";
import ExamplesPage from "./ExamplesPage/ExamplesPage.jsx";
import Components from "./examples/Components/Components.jsx";

// let hist = createMemoryHistory();

// Set scrolling to be smoothly animated.
if(window) window.scrollTo({ behavior: 'smooth' });

export default () => (
  <BrowserRouter>
    <Switch>
      {/* <Route path="/profile-page" component={ProfilePage} />
      <Route path="/login-page" component={LoginPage} /> */}
      <Route path="/components" component={Components} />
      <Route path="/" component={LandingPage} />
      <Route path="/storybook" component={ExamplesPage} />
    </Switch>
  </BrowserRouter>
);
