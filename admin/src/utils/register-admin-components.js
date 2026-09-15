export function registerAdminComponents(app, components) {
  for (const [name, component] of Object.entries(components)) {
    app.component(name, component)
  }
}
