const inputsConfig = [
  {
    key: 'accessTokenUrl',
    label: 'Access Token URL',
    labelKey: 'OAUTH.OAUTH2.FIELDS.ACCESS_TOKEN_URL'
  },
  {
    key: 'username',
    label: 'Username',
    labelKey: 'OAUTH.OAUTH2.FIELDS.USERNAME'
  },
  {
    key: 'password',
    label: 'Password',
    labelKey: 'OAUTH.OAUTH2.FIELDS.PASSWORD',
    isSecret: true
  },
  {
    key: 'clientId',
    label: 'Client ID',
    labelKey: 'OAUTH.OAUTH2.FIELDS.CLIENT_ID'
  },
  {
    key: 'clientSecret',
    label: 'Client Secret',
    labelKey: 'OAUTH.OAUTH2.FIELDS.CLIENT_SECRET',
    isSecret: true
  },
  {
    key: 'scope',
    label: 'Scope',
    labelKey: 'OAUTH.OAUTH2.FIELDS.SCOPE'
  }
];

export { inputsConfig };
