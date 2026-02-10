export const table = new sst.aws.Dynamo("Table", {
  fields: {
    PK: "string",
    SK: "string",
    gsi1pk: "string",
  },
  primaryIndex: { hashKey: "PK", rangeKey: "SK" },
  globalIndexes: {
    gsi1: { hashKey: "gsi1pk" },
  },
});
