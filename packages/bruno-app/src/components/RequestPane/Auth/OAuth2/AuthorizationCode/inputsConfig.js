const inputsConfig = [
  {
    key: 'authorizationUrl',
    label: 'Authorization URL',
    labelKey: 'OAUTH.OAUTH2.FIELDS.AUTHORIZATION_URL'
  },
  {
    key: 'accessTokenUrl',
    label: 'Access Token URL',
    labelKey: 'OAUTH.OAUTH2.FIELDS.ACCESS_TOKEN_URL'
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
  },
  {
    key: 'state',
    label: 'State',
    labelKey: 'OAUTH.OAUTH2.FIELDS.STATE'
  }
];

export { inputsConfig };
