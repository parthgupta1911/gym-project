module.exports = class ApiFeatures {
  //querryString = req.querry i.e everthing after ?
  //querry = the documents on which this query is to be done initially and then the final querry to be exeduted
  constructor(querry, querryString) {
    this.querry = querry;
    this.querryString = querryString;
  }
  filter() {
    let queryObj = { ...this.querryString };
    Object.keys(queryObj).forEach((val) => {
      if (val === "page" || val === "sort" || val === "limit" || val === "fields") {
        delete queryObj[val];
      }
    });
    let JsonQuery = JSON.stringify(queryObj);
    JsonQuery = JsonQuery.replace(/\b(gte|gt|lte|lt|ne)\b/g, (val) => `$${val}`);
    queryObj = JSON.parse(JsonQuery);
    this.querry = this.querry.find(queryObj);
    return this;
  }
  sort() {
    if (this.querryString.sort) {
      let queryObj = this.querryString.sort.split(",").join(" ");
      this.querry = this.querry.sort(queryObj);
    } else {
      this.querry = this.querry.sort("-createAt");
    }
    return this;
  }
  limitFields() {
    if (this.querryString.fields) {
      const fields = this.querryString.fields.split(",").join(" ");
      this.querry = this.querry.select(fields);
    }
    this.querry = this.querry.select("-__v");
    return this;
  }
  paginate() {
    const page = this.querryString.page * 1 || 1;
    const limit = this.querryString.limit * 1 || 20;
    const skip = (page - 1) * limit;
    this.querry = this.querry.skip(skip).limit(limit);
    return this;
  }
};
