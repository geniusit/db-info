---
template: BlogPost
path: /live-queries-client
date: 2020-11-06T17:15:50.738Z
title: Les lives queries pour une application web réactive - Partie 2
metaDescription: livequeriesclient
thumbnail: /assets/client.jpeg
---
## Introduction

Dans l'article précédent : [Les lives queries pour une application web réactive - Partie 1](/live-queries-server/), nous avons construit la partie serveur de notre full stack web app. Dans cet article, nous allons réaliser la partie client. &nbsp;\
&nbsp;\
Un bref récapitulatif de la partie 1 : Nous avons créé une base de données `PostgreSQL`. Nous avons également créé un server `node-express` lequel se connecte à notre base de données. Ensuite, nous avons ajouté `knex-migrate` dans le but de maintenir notre schéma DB et permettre d'insérer des données dans notre base de donées. Finalement, nous avons ajouté `PostGraphile` afin de générer un client `GraphQL` via `graphiql` avec toutes les opérations CRUD. &nbsp;\
&nbsp;\
Pour la couche client, nous utiliserons les technologies suivantes :

* React + TypeScript
* GraphQL
* Apollo

C'est parti!

\##Création du client React - TypeScript React est une librairie JavaScript permettant de créer des interfaces utilisateurs, et TypeScript est un superset typé de JavaScript. En utilisant cette combinaison, nous pouvons essentiellement construire nos IHMs en utilisant une version typée de JavaScript.
&nbsp;\
Pour démarrer, lançons la commande suivante depuis le dossier principal de notre stack applicative. Cela créera l'application react avec TypeScript.

```bash
npm create react-app client --template typescript
```

&nbsp;\
De part notre utilisation de `GraphQL`, `Apollo Client` est un bon candidat. `Apollo Client` est une librairie `JavaScript` permettant la gestion complète du `state`. Dès que nous écrivons une requête `GraphQL`, `Apollo Client` veillera à effectuer la requête ainsi que la mise en cache des données, tout en mettant à jour notre IHM. &nbsp;\
Nous avons besoin de quelques packages pour définir notre architecture. Voici la commande permettant l'installation de ces packages :

```bash
yarn add @apollo/client @apollo/react-components @apollo/react-hoc @types/graphql graphql graphql-tag
```

&nbsp;\
Nous utiliserons `apollo-hooks` pour utiliser les `subscriptions` GrapQL. Avant cet étape, structurons notre application comme ceci :

```bash
/src
    - components
    - graphql
        - query
        - mutations
```

&nbsp;\
Le dossier `components` contiendra nos composants react. Sous le dossier `graphql`, le dossier `query` contiendra toutes nos requêtes (`queries` + `subscriptions`) `GraphQL`. Quant aux mutations, elles se trouveront dans le dossier `mutations`. &nbsp;\
##Intégration du CLI GraphQL Codegen

Encore un outil de plus!? Qu'est-ce donc ?

`GraphQL Code Generator` est un outil de type CLI pouvant générer tous les typages `TypeScript` d'un schéma `GraphQL`. `GraphQL Code Generator` permet de spécifier les scripts devant être exécutés selon certains évènements définis. (Dans notre cas, ce sera des `hooks` basés sur des `subscriptions`.) Afin de pouvoir utiliser `GraphQL` en tant que `hooks` pour nos `queries`, `mutations` et `subscriptions`, nous devons implémenter `graphql-code-generator`. L'installation se fait  comme ceci :

```bash
yarn add -D @graphql-codegen/cli
```

&nbsp;\
Installons ensuite la bonne configuration en exécutant la commande suivante :

```bash
yarn graphql-codegen init
```

&nbsp;\
Cela lancera le CLI wizard. Ensuite, suivons les étapes listés ci-dessous :

* L'application est faite en React.
* L'adresse du schéma est la suivante : *http://localhost:8080/graphql* 
* Adresse de nos opérations et fragments : `./src/components/**/*.tsx`. Cela recherchera tous les fichiers `TypeScript` pour la déclarations des requêtes.
* Utilisation des plugins par défaut : `TypeScript`, `TypeScript Operations`, `TypeScript React Apollo`.
* Mettez à jour la destination des composants générés à `src/generated/graphql.tsx` (.tsx est requis par le plugin `react-apollo`).
* Ne pas générer de fichier d'introspection.
* Utiliser le fichier par défaut `codegen.yml`
* Utiliser la valeur `codegen` pour démarrer le script. Cela créera un fichier `codegen.yml` à la racine du projet. Nous devons encore ajouter un répertoire à notre fichier `codegen.yml` étant donné que vous sauvegardons nos `queries`, `mutations` et `subscriptions` de façon séparée. Nous devons également ajouter un élément de configuration supplémentaire : `withHooks: true`. Cela génèrera également des `hooks` React typés pour nos `queries`, `mutations` et `subscriptions`. Ajoutons aussi l'entrée `./src/graphql/**/*.ts`. Cest l'emplacement de nos requêtes `GraphQL`.

Notre fichier de configuration `codegen.yml` devrait renssembler à ceci : 

```yml
overwrite: true
schema: "http://localhost:8080/graphql"
documents: 
  - "./src/components/**/*.tsx"
  - "./src/graphql/**/*.ts"
generates:
  src/generated/graphql.tsx:
    plugins:
      - "typescript"
      - "typescript-operations"
      - "typescript-react-apollo"
    config:
      withHooks: true
```

&nbsp;\
Pour disposer de `queries`, `mutations` et `subscriptions` basées sur les `hooks`, nous avons ajouté leurs dossiers respectifs. Pour valider tout cela, faites un 

```bash
npm i
```

&nbsp;\
Créons dès à présent une souscriptinos qui permettra de garder l'état de notre utilisateur. Faisons cela en créant un nouveau fichier `getUsers.query.ts` dans le dosser `src/graphql/query`. (Vous pouvez vous aider de *`http://localhost:8080/graphiql`* pour récupérer la syntaxe correcte). Voici nos requêtes permettant de récupérer les utilisateurs et de maintenanir leurs états :

```javascript
import gql from 'graphql-tag';

export default gql`
  subscription getUsersSub {
    allUsers {
      nodes {
        email
        id
        name
        createdAt
      }
    }
  },
  query getUsers {
    allUsers {
      nodes {
        email
        id
        name
        createdAt
      }
    }
  }
`;
```

&nbsp;\
A présent, positionnez-vous dans le dossier `client` et exécutez la commande suivante :

```
yarn codegen
```

&nbsp;\
Cela a pour effet de générer le fichier `src/generated/graphql.tsx` basé sur la configuration définie dans `codegen.yml`. Lorsque nous ouvrons le fichier, nous voyons qu'il s'agit de type généré et requêtes de type `react hooks` basées sur notre schéma et nos fichier de requête. Note : Nous devons exécuter la commande `yarn codegen` chaque fois que nous ajouter une nouvelle `query`, `mutation` ou `subscription` dans le dossier `graphql`.

## Utilisation de Queries, Mutations et Subscriptions dans le client

Nous avons maintenant des `queries`, `mutations` et `subscriptions` basées sur les `hooks` à notre disposition. Nous pouvons donc les utiliser pour afficher de la donnée. Voici le fichier d'exemple pour afficher nos utilisateurs, en utilisant le requête de type hook générée lors de l'étape précédente. Voici le contenu du composant `User`. Créez le fichier `User.tsx` dans le dosser `src/components`. Voici son contenu :

```javascript
import React, { useEffect } from 'react';
import { User } from '../generated/graphql';
import { useGetUsers } from '../utils/services';


const Users: React.FC = () => {
  const { data, error, loading } = useGetUsers();

  const users = loading ? [] : data.allUsers.nodes;

  useEffect(() => {
    if (error) {
      console.log(error);
    }
    if (loading) {
      console.log(loading);
    }
  }, [data, error, loading]);

  return (
    <>
      <h2>Hello users,</h2>
      {users.map((user: User, index: number) => (
        <p key={`user_${index}`}>{user.name} </p>
      ))}
    </>
  );
};

export default Users;
```

&nbsp;\
Nous utilisons une classe utilitaire `utils/services.ts` dont voici le contenu : 

```javascript
 import {
    useGetUsersSubSubscription
} from '../generated/graphql'

export const useGetUsers = useGetUsersSubSubscription
```

&nbsp;\
L'étape suivante consiste en la configuration du client `Apollo`. Créez le fichier `Apollo.tsx` dans le dossier `src`. Voici son contenu : 

```javascript
import { ApolloClient, NormalizedCacheObject } from '@apollo/client';

import { HttpLink, InMemoryCache, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { WebSocketLink } from '@apollo/client/link/ws';

const cache = new InMemoryCache();

const httpLink = new HttpLink({
  uri: 'http://localhost:8080/graphql',
});

const wsLink = new WebSocketLink({
  uri: `ws://localhost:8080/graphql`,
  options: {
    reconnect: true,
  },
});

// The split function takes three parameters:
//
// * A function that's called for each operation to execute
// * The Link to use for an operation if the function returns a "truthy" value
// * The Link to use for an operation if the function returns a "falsy" value
const link = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  cache,
  link,
});

export default client;
```

&nbsp;\
Ensuite, nous pouvons importer le composant `Users` ainsi que le composant `ApolloClient` dans le fichier `App.tsx`. Voici le résultat :

```javascript
import React from 'react';
import logo from './logo.svg';
import './App.css';
import Users from './components/Users';

import client from './ApolloClient'

import { ApolloProvider } from '@apollo/client';


const App: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <div className='App'>
        <header className='App-header'>
          <img src={logo} className='App-logo' alt='logo' />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <Users />
        </header>
      </div>
    </ApolloProvider>
  );
};

export default App;
```

&nbsp;\
Le projet peut enfin être démarré! Mais avant cela, une toute dernière chose! Il convient de faire une petite modification dans le fichier de configuration de `TypeScript`. Ouvre donc le fichier `tsconfig.json` situé à la racine du projet et modifez la ligne suivante :

```json
"strict": true,
```

&nbsp;\
Changez la valeur par false. Cette fois c'est la bonne. Démarrons l'application.

```bash
yarn start
```

&nbsp;\
Une page web devrait s'ouvir à l'adresse *`http://localhost:3000`*. Voici le résultat :
&nbsp;\
&nbsp;\
![Alt text here](/assets/result.png#lightbox=true;display=block;margin-left=auto;margin-right=auto;width=100%)

Afin de vérifier que notre stack applicative fonctionne de bout en bout, allez dans `PgAdmin` modifiez à nouveau la valeur du champ `name` d'un enregistrement de la table `users`. C'est magique, la valeur change automatiquement dans la vue!
Vous venez de mettre en place une application full stack utilisant les `lives queries` &nbsp;\
Félications!

## Conclusion et remerciements

Les `lives queries` sont un outil vraiment intéressant pour les applications front-end. Spécialement utiles pour les applications utilisées en interne dans les entreprises. Prenez garde si vous ouvrez une application utilisant les `lives queries` sur internet avec potentiellement des millions d'utilisateurs.  La technologie est encore à ces débuts et il n'existe pas de norme ou de façon standard de l'implémenter.
Il convient également de bien comprendre la différence entre les `lives queries` et les  `subscriptions`. Ce sont deux choses complètement différentes. `PostGraphile` implémente les `lives queries` via le mot-clé `subscriptions`. Attention à bien faire la distinction entre les deux. J'ai ajouté quelques liens expliquant le concept. En résumé, partons du principe que les `subscriptions` sont utilisées pour réagir à un évènement alors que les `lives queries` sont utilisées pour réagir à un changement d'état d'une donnée. La solution présentée dans cette série d'article est bien mais est fortement couplée à la technologie `PostgreSQL`. Il est possible d'ajouter une couche d'abstraction supplémentaire afin de rendre l'unité de persistance indépendante. Un outil existe pour cela et il se nomme `Debezium`. Cette solution utilise des topics `kafka`. J'ai ajouté le liens ci-dessous.

Merci à Pratik Agashe pour son article initial sur lequel je me suis très largement inspiré.

## Liens utiles et lectures supplémentaires

<https://www.youtube.com/watch?v=TUgYyWC22og&ab_channel=Postman>

<https://medium.com/open-graphql/graphql-subscriptions-vs-live-queries-e38302c7ab8e>

<https://hasura.io/learn/graphql/react/intro-to-graphql/4-watching-data-subscriptions/>

<https://www.howtographql.com/graphql-js/7-subscriptions/>

<https://github.com/graphql/graphql-playground>

<https://www.npmjs.com/package/@graphile/subscriptions-lds>

<https://www.graphile.org/postgraphile/live-queries/>

<https://www.apollographql.com/docs/graphql-subscriptions/setup/>

<https://www.apollographql.com/blog/how-to-use-subscriptions-in-graphiql-1d6ab8dbd74b/>

<https://www.apollographql.com/docs/graphql-subscriptions/subscriptions-to-schema/>

<https://www.apollographql.com/docs/react/data/subscriptions/>

<https://www.apollographql.com/docs/react/api/react/hooks/#options>

<https://www.apollographql.com/docs/react/data/queries/>

<https://github.com/dotansimha/graphql-code-generator>

<https://github.com/apollographql/apollo-tooling/>

<https://graphql-code-generator.com/docs/getting-started/development-workflow>

<https://github.com/eulerto/wal2json>

<https://debezium.io/>

<https://github.com/akhilman/graphka>