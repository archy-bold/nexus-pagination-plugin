# nexus-pagination-plugin

A plugin for adding offset-based pagination to your nexus types

## Installation

```
yarn add nexus-plugin-shield
```
or
```
npm install nexus-plugin-shield
```

## Pagination Plugin

The pagination plugin provides a new method on the object definition builder, enabling paginated associations between types, following the offset-based pagination standard defined below.

## Offset-Based Pagination Standard

A paginated query field should receive two arguments:

* `page`
  * The current page being request. Defaults to 1
* `pageSize`
  * The size of pages being used. Defaults to 25

A paginated query field should return a type that contains the following:

* `results`
  * A collection of the data requested
* `pageInfo`
  * A type that contains information about the pagination
  * `page`
  * `nextPage`
  * `totalPages`

## Setup

```ts
import { makeSchema} from 'nexus';
import { paginationPlugin } from 'nexus-pagination-plugin';

export const schema = makeSchema({
  // ... types, etc,
  plugins: [
    // ... other plugins
    paginationPlugin()
  ],
});

```

## Example Usage

This plugin surfaces a `t.paginatedQueryResult` function that can be used to add pagination to a given type.

```ts
// User Type
export const User = objectType({
  name: 'User',
  description: 'A User',
  definition(t) {
    t.nonNull.id('id');
    t.nonNull.string('firstName');
    t.nonNull.string('lastName');
  },
});

// add paginated users query
export const UsersQuery = queryField((t) => {
  t.paginatedQueryResult('users', {
    type: 'User',
    resolve: async (_root, args, ctx) => {
      const { take, skip } = ctx.paginationParams;

      const users = await ctx.prisma.user.findMany({
        skip,
        take,
      });
      const usersCount = await ctx.prisma.user.count();
      const pageInfo = ctx.calculatePageInfo(usersCount);

      return {
        results: users,
        pageInfo
      }
    },
  })
})
```

## Options



