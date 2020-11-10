---
template: BlogPost
path: /live-queries-client
date: 2020-11-06T17:15:50.738Z
title: Les lives queries pour une application web réactive - Partie 2
thumbnail: /assets/client.jpeg
metaDescription: livequeriesclient
---

## Introduction


Dans l'article précédent : [Les lives queries pour une application web réactive - Partie 1](/live-queries-server/), nous avons construit la partie serveur de full stack web app. Dans cet article, nous allons réaliser la partie client.
&nbsp;  
&nbsp;  
Un bref récapitulatif de la partie 1 : Nous avons créé une base de données `PostgreSQL`. Nous avons également créé un server `node-express` lequel se connecte à notre base de données. Ensuite, nous avons ajouté `knex-migrate` dans le but de maintenir notre schéma DB et permettre d'insérer des données dans notre base de donées. Finalement, nous avons ajouté `PostGraphile` afin de générer un client `GraphQL` via `graphiql` avec toutes les opérations CRUD.
&nbsp;  
&nbsp;  
Pour la couche client, nous utiliserons les technologies suivantes :
* React + TypeScript
* GraphQL
* Apollo

C'est parti!

##Création du client React - TypeScript
React est une librairie JavaScript permettant de créer des interfaces utilisateurs, et TypeScript est un superset typé de JavaScript. En utilisant cette combinaison, nous pouvons essentiellement construire nos IHMs en utilisant une version typée de JavaScript.
&nbsp;  
Pour démarrer, lançons la commande suivante depuis le dossier principal de notre stack applicative. Cela créera l'application react avec TypeScript.

```bash
npm create react-app client --template typescript
```
&nbsp;  
De part notre utilisation de `GraphQL`, `Apollo Client` est un bon candidat. `Apollo Client` est une librairie `JavaScript ` permettant la gestion complète du `state`. Dès que nous écrivons une requête `GraphQL`, `Apollo Client` veillera à effectuer la requête ainsi que la mise en cache des données, tout en mettant à jour notre IHM.
&nbsp;  
Nous avons besoin de quelques packages pour définir notre architecture. Voici la commande permettant l'installation de ces packages :

```bash
yarn add @apollo-client @apollo/react-components @apollo/react-hoc @types/graphql graphql graphql-tag
```
&nbsp;  
Nous utiliserons `apollo-hooks` pour utiliser les `subscriptions` GrapQL. Avant cet étape, structurons notre application comme ceci :

```bash
/src
    - components
    - graphql
        - query
        - mutations
```
&nbsp;  
Le dossier `components` contiendra nos composants react. Sous le dossier `graphql`, le dossier `query` contiendra toutes nos requêtes (query + subscription) `GraphQL`. Quant aux mutations, elles se trouveront dans le dossier `mutations`.
&nbsp;  
##Intégration du CLI GraphQL Codegen

Encore un outil de plus!? Qu'est-ce donc ?

`GraphQL Code Generator` est un outil de type CLI pouvant générer tous les typages `TypeScript` d'un schéma `GraphQL`.
`GraphQL Code Generator` vous permet de spécifier les scripts devant être exécutés pour vous selon certains évènements définis. (Dans notre cas, ce sera des `hooks` basés sur des `subscriptions`.)
Afin de pouvoir utiliser `GraphQL` en tant que `hooks` pour nos `queries`, `mutations` et `subscriptions`, nous devons implémenter `graphql-code-generator`.
L'installatino se fait  comme ceci :
```bash
yarn add -D @graphql-codegen/cli @graphql-codegen/introspection @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo
```
&nbsp;  
Installons ensuite la bonne configuration en exécutant la commande suivante :
```bash
yarn graphql-codegen init
```
&nbsp;  
Cela lancera le CLI wizard. Ensuite, suivons les étapes listés ci-dessous :
* L'application est faite en React.
* L'adresse du schéma est la suivante : *http://localhost:8080/graphql* 
* Adresse de nos opérations : *./src/components/**/*.ts*. Cela recherchera tous les fichiers `TypeScript` pour la déclarations des requêtes.
* Utilisation des plugins par défaut : `TypeScript`, `TypeScript Operations`, `TypeScript React Apollo`.
* Mettez à jour la destination des composants générés à `src/generated/graphql.tsx` (.tsx est requis par le plugin `react-apollo`).
* Ne pas générer de fichier d'introspection.
* Utiliser le fichier par défaut `codegen.xml`
* Utiliser la valeur `codegen` pour démarrer le script.
Cela créera un fichier `codegen.xml` à la racine du projet.
Nous devons encore ajouter un répertoire à notre fichier `codegen.xml` étant donné que vous sauvegardons nos `queries`, `mutations` et `subscriptions` de façon séparée. Nous devons également ajouter un élément de configuration supplémentaire : `withHooks: true`. Cela génèrera également des `hooks` React typés pour nos `queries`, `mutations` et `subscriptions`/

Notre fichier de configuration `codegen.xml` devrait renssembler à ceci : 
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

```
&nbsp;  
Pour disposer de `queries`, `mutations` et `subscriptions` basés sur les `hooks`, nous avons ajouté leurs dossiers respectifs et avons exécuté la commende `codegen`.

Créons une souscriptinos qui permettra de garder l'état de notre utilisateur. Faisons cela en créant un nouveau fichier sous le dosser `src/graphql/query`. (Vous pouvez vous aider de *`http://localhost:8080/graphiql`* pour récupérer la syntaxe correcte). Voici nos requêtes permettant de récupérer les utilisateurs et de maintenanir leurs états :
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
&nbsp;  
A présent, positionnez-vous dans le dossier `client` et exécutez la commande suivante :
```
yarn codegen
```
&nbsp;  
Cela a pour effet de générer le fichier `src/generated/graphql.tsx` basé sur la configuration définie dans `codegen.yml`.
Lorsque nous ouvrons le fichier, nous voyons qu'il s'agit de type généré et requêtes de type `react hooks` basées sur notre schéma et nos fichier de requête.
Note : Nous devons exécyter `yarn codegen` chaque fois que nous ajouter une nouvelle `query`, `mutation` ou `subscription` dans le dossier `graphql`.


Step 7: Use generated Queries and Mutation in Client
We have hook-based queries and mutations available now, so we can use them to display data. Here’s the sample file where we will display users, using generated hooked query:

client/src/Components/Users.tsx
Next, we can import the Users component into our App.tsx , and run the project using the following command:
yarn start
Image for post
Similarly, we have to use mutations. Let’s create one mutation to update the user name.
First, check the syntax on http://localhost:8080/graphiql. From our graphiql we will get the mutation we need. Here’s an image for reference:
Image for post
Mutations under graphiql.
Let’s create one more file under src/graphql/mutations/updateUserById.mutation.ts . Here’s the mutation to update user details by id:

client/src/graphql/query/updateUserById.mutation.ts
To have this mutation available in hooks, we’ll need to run the following command:
yarn codegen
Before we create a component to update the user, I prefer to have a separate file with the queries and mutations we will use. This is optional, but the reason I like it is that it allows us to get rid of the query and mutation extensions. Also, we can add some custom services in this file and use it from there. This will create one disciplined folder and code structure.
To do so, let create one file under src/utils/services.ts . Now we will import all queries and mutations we will be using in the project. Here’s the code:

client/src/utils/services.ts
Let’s create a new component to update user details under src/Components/UpdateUser.tsx :

client/src/Components/UpdateUser.tsx
Now we have updated the Users component to pass details to our newUpdateUser component, and updated the query fetch source to services. For reference:

client/src/Components/Users.tsx
And now we have completed the architecture! Now we can update our client, server and database.
Good luck! Cheers!

## Conclusion

Pour rendre la solution indépendante du système de persistance, il convient d'ajouter une couche d'abstraction supplémentaire. 
Je conseille la solution Debezium.



Lectures : https://medium.com/open-graphql/graphql-subscriptions-vs-live-queries-e38302c7ab8e
https://hasura.io/learn/graphql/react/intro-to-graphql/4-watching-data-subscriptions/
https://www.howtographql.com/graphql-js/7-subscriptions/

https://github.com/graphql/graphql-playground
https://www.npmjs.com/package/@graphile/subscriptions-lds
https://www.apollographql.com/docs/graphql-subscriptions/subscriptions-to-schema/
https://www.apollographql.com/blog/how-to-use-subscriptions-in-graphiql-1d6ab8dbd74b/
https://www.apollographql.com/docs/react/data/subscriptions/
https://www.graphile.org/postgraphile/live-queries/
https://medium.com/make-it-heady/part-1-building-full-stack-web-app-with-postgraphile-and-react-server-side-529e2f19e6f1
https://medium.com/make-it-heady/part-2-building-full-stack-web-app-with-postgraphile-and-react-client-side-1c5085c5a182
https://www.graphile.org/postgraphile/live-queries/
https://www.apollographql.com/docs/graphql-subscriptions/setup/
https://www.apollographql.com/blog/how-to-use-subscriptions-in-graphiql-1d6ab8dbd74b/
https://github.com/dotansimha/graphql-code-generator
https://github.com/apollographql/apollo-tooling/
https://graphql-code-generator.com/docs/getting-started/development-workflow
https://www.apollographql.com/docs/react/api/react/hooks/#options
https://www.apollographql.com/docs/react/data/queries/
https://github.com/eulerto/wal2json
