function env(name) {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof _getEnv === 'function') {
    return _getEnv(name);
  }
  return null;
}

function requireEnv(name) {
  var value = env(name);
  if (!value) {
    throw new Error('Missing required Mongo init environment variable: ' + name);
  }
  return value;
}

function createReadWriteUser(databaseName, usernameEnv, passwordEnv) {
  var username = requireEnv(usernameEnv);
  var password = requireEnv(passwordEnv);
  var targetDb = db.getSiblingDB(databaseName);

  if (targetDb.getUser(username)) {
    print('Mongo user already exists: ' + username + ' on ' + databaseName);
    return;
  }

  targetDb.createUser({
    user: username,
    pwd: password,
    roles: [
      { role: 'readWrite', db: databaseName }
    ]
  });
  print('Mongo user created: ' + username + ' on ' + databaseName);
}

createReadWriteUser('tiledesk', 'MONGO_TILEDESK_USERNAME', 'MONGO_TILEDESK_PASSWORD');
createReadWriteUser('tiledesk-logs', 'MONGO_LOGS_USERNAME', 'MONGO_LOGS_PASSWORD');
createReadWriteUser('chat21', 'MONGO_CHAT21_USERNAME', 'MONGO_CHAT21_PASSWORD');
