db.getCollectionNames().forEach(name => {
  if (name.endsWith("_new") || name.endsWith("_old_backup")) {
    print("dropping " + name);
    db[name].drop();
  }
});