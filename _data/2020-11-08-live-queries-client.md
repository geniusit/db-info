---
template: BlogPost
path: /live-queries-client
date: 2020-11-06T17:15:50.738Z
title: Les lives queries pour une application web réactive - Partie 2
thumbnail: /assets/client.jpeg
metaDescription: livequeriesclient
---

## Introduction


Dans l'article précédent : [Les lives queries pour une application web réactive - Partie 1](/live-queries-server/), nous avons construit la partie serveur de full stack web app. Dans cette article, nous allons réaliser la partie client. 


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
