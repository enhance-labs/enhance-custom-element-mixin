// Mixin specifically for reusing SFCs as Custom Elements in the browser
const CustomElementMixin = (superclass) => class extends superclass {
  constructor() {
    super()
    // Removes style tags as they are already inserted into the head by SSR
    // TODO: If only added dynamically in the browser we need to insert the style tag after running the style transform on it. As well as handle deduplication.
    let tagName = customElements.getName ? customElements.getName(this.constructor) : this.registeredName
    this.template.content.querySelectorAll('style')
      .forEach((tag) => {
        const rules = this.rulesForCssText(tag.textContent)
        console.log(rules)

        const sheet = new CSSStyleSheet();
        for (let rule of rules) {
          if (rule.conditionText) {
            let selectorText = ''
            for (let innerRule of rule.cssRules) {
              let selectors = innerRule.selectorText.split(',')
              selectorText = selectors.map(selector => {
                if (selector.startsWith(':host')) {
                  let a = selector.replace(':host', tagName)
                  return innerRule.cssText.replace(innerRule.selectorText, a)
                } else {
                  let a = `${tagName} ${selector}`
                  return innerRule.cssText.replace(innerRule.selectorText, a)
                }
              }).join(',')
            }
            console.log(`${rule.media ? '@media' : ''} ${rule.conditionText} { ${selectorText}}`)
            sheet.insertRule(`${rule.media ? '@media' : ''} ${rule.conditionText} { ${selectorText}}`, sheet.cssRules.length)
          } else {
            let selectors = rule.selectorText.split(',')
            let selectorText = selectors.map(selector => {
              if (selector.startsWith(':host')) {
                return selector.replace(':host', tagName)
              } else {
                return `${tagName} ${selector}`
              }
            }).join(',')
            sheet.insertRule(rule.cssText.replace(rule.selectorText, selectorText), sheet.cssRules.length)
          }
        }
        console.log(sheet)
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]

        this.template.content.removeChild(tag)
      }
      )
    // Removes script tags as they are already appended to the body by SSR
    // TODO: If only added dynamically in the browser we need to insert the script tag after running the script transform on it. As well as handle deduplication.
    this.template.content.querySelectorAll('script')
      .forEach((tag) => { this.template.content.removeChild(tag) })

    // If the Custom Element was already expanded by SSR it will have the "enhanced" attribute so do not replaceChildren
    if (!this.hasAttribute('enhanced')) {
      // If this Custom Element was added dynamically with JavaScript then use the template contents to expand the element
      this.replaceChildren(this.template.content.cloneNode(true))
    }
  }

  rulesForCssText(styleContent) {
    const doc = document.implementation.createHTMLDocument("")
    const styleElement = document.createElement("style")

    styleElement.textContent = styleContent
    doc.body.appendChild(styleElement)

    return styleElement.sheet.cssRules
  }
}
export default CustomElementMixin
