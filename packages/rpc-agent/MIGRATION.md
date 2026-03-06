# Note de migration - RPC Cross-Stack Compatibility

## Packages concernés

| Package                                    | Version   |
| ------------------------------------------ | --------- |
| `@forestadmin-experimental/rpc-agent`      | `>2.7.0`  |
| `@forestadmin-experimental/datasource-rpc` | `>1.10.0` |

## Breaking changes

### 1. Suppression du SSE (Server-Sent Events)

Le mécanisme de détection de changements de schéma via SSE (`eventsource`) a été **remplacé par du polling HTTP**. La dépendance `eventsource` a été supprimée de `datasource-rpc`.

**Avant :** Le client se connectait en SSE à `/forest/rpc-sse` pour recevoir les notifications de changement de schéma en temps réel.

**Après :** Le client interroge périodiquement `/forest/rpc-schema` avec un header `if-none-match` (ETag). Si le schéma n'a pas changé, le serveur répond `304 Not Modified`.

**Configuration du polling :**

```ts
createRpcDataSource({
  uri: 'http://localhost:3352',
  authSecret: process.env.FOREST_AUTH_SECRET,
  pollingInterval: 600, // en secondes (défaut: 600, min: 1, max: 3600)
});
```

## Nouvelles fonctionnalités

### 1. Support des capabilities d'agrégation

Le schéma RPC transporte désormais les **aggregation capabilities** de chaque collection :

- `support_groups` : indique si la collection supporte les groupements
- `supported_date_operations` : liste des opérations de date supportées

Cela permet au `datasource-rpc` de configurer correctement `setAggregationCapabilities()` sur chaque collection, ce qui est nécessaire pour le bon fonctionnement des charts et agrégations côté consumer.

### 2. Support des Native Queries

Nouveau endpoint `/forest/rpc-native-query` côté `rpc-agent`, et le `datasource-rpc` expose désormais `executeNativeQuery()` qui forward les appels vers le RPC agent.

Le schéma d'introspection contient la liste des `native_query_connections` disponibles.

### 3. Introspection en fallback

Le `createRpcDataSource` accepte maintenant une option `introspection` qui sert de **fallback** si le RPC agent est injoignable au démarrage :

```ts
createRpcDataSource({
  uri: 'http://localhost:3352',
  authSecret: process.env.FOREST_AUTH_SECRET,
  introspection: cachedSchema, // optionnel, utilisé si le serveur est down
});
```

Attention, les fichiers d'introspection ont changé pour utiliser ceux généré par les rpc agents.

## Côté `rpc-agent` - Points clés

### Sérialisation du schéma

Le `RpcAgent` construit et cache le schéma au démarrage (`buildSchema`). Le schéma est :

- Sérialisé en **snake_case** (convention du protocole RPC)
- Hashé en SHA-1 pour générer un **ETag**
- Sauvegardé dans `.forestadmin-rpc-schema.json`
- Le schéma n'est **pas envoyé** à Forest Admin (le RPC agent ne communique pas directement avec Forest Admin)

### Marquage des collections RPC

Les collections qui appartiennent au consumer (et non au RPC agent) peuvent être marquées :

```ts
agent.addDataSource(factory, { markCollectionsAsRpc: true });
// ou
agent.markCollectionsAsRpc('CollectionA', 'CollectionB');
```

Les relations entre collections RPC et collections locales sont extraites dans `rpc_relations` dans le schéma, puis réconciliées côté consumer via le plugin `reconciliateRpc`.

## Côté `datasource-rpc` - Points clés

### Utilisation basique

```ts
const { createAgent } = require('@forestadmin/agent');
const {
  createRpcDataSource,
  reconciliateRpc,
} = require('@forestadmin-experimental/datasource-rpc');

const agent = createAgent(options).addDataSource(
  createRpcDataSource({
    uri: 'http://localhost:3352',
    authSecret: process.env.FOREST_AUTH_SECRET,
  }),
);

// Si l'agent a aussi des datasources locales avec des relations cross-stack
agent.use(reconciliateRpc);
```

### Plugin `reconciliateRpc`

Ce plugin est **indispensable** si des relations existent entre les collections du RPC agent et les collections locales du consumer. Il :

1. Désactive la recherche sur les collections non-searchable
2. Recrée les relations (ManyToOne, OneToMany, OneToOne, ManyToMany) entre les collections cross-stack

Il supporte une option `rename` pour gérer les cas où les collections sont renommées :

```ts
agent.use(reconciliateRpc, { rename: { OldName: 'NewName' } });
// ou avec une fonction
agent.use(reconciliateRpc, { rename: name => `prefix_${name}` });
```

## Protocole d'authentification

Toutes les requêtes RPC sont signées via HMAC-SHA256 :

- Header `X_SIGNATURE` : HMAC du timestamp avec le `authSecret`
- Header `X_TIMESTAMP` : timestamp ISO de la requête
- Header `forest_caller` : informations du caller (sérialisé en JSON)

Le `authSecret` doit être **identique** côté `rpc-agent` et côté `datasource-rpc`.
