"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationPlugin = void 0;
const nexus_1 = require("nexus");
const utils_1 = require("nexus/dist/utils");
;
const DEFAULT_PAGE_SIZE = 25;
const getDefaultGeneratedTypename = (targetTypeName) => {
    return `Paginated${targetTypeName}s`;
};
/**
 * A nexus plugin to help with offset/limit pagination, used with `t.paginatedQueryField`
 * Automatically generates pagination fields for a model.
 * Adds functions to get the params and calculate page info to the context object.
 */
const paginationPlugin = (config = {}) => {
    const { defaultPageSize = DEFAULT_PAGE_SIZE, getGeneratedTypename = getDefaultGeneratedTypename, } = config;
    return (0, nexus_1.plugin)({
        name: 'PaginationPlugin',
        description: 'Add the ability to create paginated query fields',
        fieldDefTypes: [
            // Add PaginatedQueryFieldConfig to generated types
            (0, utils_1.printedGenTypingImport)({
                module: 'nexus-pagination-plugin',
                bindings: ['PaginatedQueryFieldConfig'],
            }),
        ],
        onInstall(builder) {
            // Add PageInfo type
            builder.addType((0, nexus_1.objectType)({
                name: 'PageInfo',
                description: 'Pagination info',
                definition(t) {
                    t.int('page');
                    t.int('nextPage');
                    t.int('totalPages');
                },
            }));
            builder.addType(
            // Add t.paginatedQueryField method
            (0, nexus_1.dynamicOutputMethod)({
                name: 'paginatedQueryField',
                typeDescription: 'Creates a paginated query field',
                // type definition for our function
                typeDefinition: `
            <FieldName extends string>(
              fieldName: FieldName,
              config: PaginatedQueryFieldConfig<TypeName, FieldName>
            ): void
          `,
                factory({ 
                // query field type definition
                typeDef: t, 
                // args passed to t.paginatedQueryField
                args: factoryArgs, builder, }) {
                    const [fieldName, fieldConfig] = factoryArgs;
                    const targetTypeName = typeof fieldConfig.type === 'string'
                        ? fieldConfig.type
                        : fieldConfig.type.name;
                    const generatedTypeName = fieldConfig.generatedTypename || getGeneratedTypename(targetTypeName);
                    if (!builder.hasType(generatedTypeName)) {
                        builder.addType((0, nexus_1.objectType)({
                            name: generatedTypeName,
                            definition(t2) {
                                t2.nonNull.list.nonNull.field('results', {
                                    type: fieldConfig.type,
                                    description: `Collection of ${fieldName}`,
                                });
                                t2.nonNull.field('pageInfo', {
                                    type: 'PageInfo',
                                    description: 'Pagination information',
                                });
                            },
                        }));
                    }
                    t.field(fieldName, Object.assign(Object.assign({}, fieldConfig), { 
                        // override resolve function to add pagination logic
                        resolve: (...props) => {
                            const [root, args, context, info] = props;
                            const { page, pageSize } = args;
                            const skip = ((page !== null && page !== void 0 ? page : 1) - 1) * pageSize;
                            const take = pageSize;
                            const paginationParams = {
                                skip,
                                take,
                            };
                            const calculatePageInfo = (count) => {
                                const totalPages = Math.ceil(count / pageSize);
                                const nextPage = page + 1 <= totalPages ? page + 1 : null;
                                return {
                                    page,
                                    nextPage,
                                    totalPages,
                                };
                            };
                            const paginationContext = {
                                paginationParams,
                                calculatePageInfo,
                            };
                            return fieldConfig.resolve(root, args, Object.assign(Object.assign({}, context), paginationContext), info);
                        }, 
                        // not sure why we need to cast this as any
                        type: generatedTypeName, args: Object.assign(Object.assign({}, fieldConfig.args), { 
                            // add pagination args
                            page: (0, nexus_1.arg)({ type: 'Int', default: 1 }), pageSize: (0, nexus_1.arg)({
                                type: 'Int',
                                default: fieldConfig.defaultPageSize || defaultPageSize,
                            }) }) }));
                },
            }));
        },
    });
};
exports.paginationPlugin = paginationPlugin;
//# sourceMappingURL=index.js.map