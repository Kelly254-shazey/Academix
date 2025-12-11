/// <reference types="cypress" />

describe('Academix Application', () => {
  it('should load the homepage successfully', () => {
    // The test will visit the frontend URL, which is running on port 3000
    cy.visit('http://localhost:3000');

    // This is an example assertion. You should change 'h1' to a selector
    // that exists on your homepage, and 'Welcome to Academix' to the
    // expected text content.
    cy.get('h1').should('contain', 'Welcome to Academix');
  });
});