import * as SUT from '../index.js'

describe("arrayToMap", function() {
    const input = [
        {foo:"bar", value:"baz", value2:"bax"},
        {foo:"car", value:"caz", value2:"cax"},
    ]

    const input2 = [
        {foo:"dar", value:"daz", value2:"dax"},
        {foo:"ear", value:"eaz", value2:"eax"},
    ]

    it("should return an object", function() {
        expect(SUT.arrayToMap(input, 'foo')).toBeInstanceOf(Object);
    });

    it("should get the filednames from the selector", function() {
        expect(Object.keys(SUT.arrayToMap(input, 'foo'))).toEqual(["bar", "car"])
        expect(Object.keys(SUT.arrayToMap(input2, 'foo'))).toEqual(["dar", "ear"])
    })

    it("should popluate the results with the remaining values", function() {
        expect(SUT.arrayToMap(input, 'foo').bar).toEqual(jasmine.objectContaining({value:'baz', value2:'bax'}))
    })
});

describe('repeatEntries', function() {
    it('should maintain singular records', function() {
        const input = [
            {foo:"G4", bar:'z'}
        ]

        expect(
            SUT.repeatEntries(input, 'foo')
        ).toEqual([
            {foo:"G4", bar:'z'}
        ])

    })

    it('should duplicate records seperated by commas', function() {
        const input = [
            {foo:"x,y", bar:'z'}
        ]

        expect(
            SUT.repeatEntries(input, 'foo')
        ).toEqual([
            {foo:"x", bar:'z'},
            {foo:"y", bar:'z'}
        ])
    })

    it('should duplicate ranges of records that start with T', function() {
        const input = [
            {foo:"T01-T4", bar:'z'}
        ]

        expect(
            SUT.repeatEntries(input, 'foo')
        ).toEqual([
            {foo:"T01", bar:'z'},
            {foo:"T02", bar:'z'},
            {foo:"T03", bar:'z'},
            {foo:"T04", bar:'z'}
        ])
    })

    it('should duplicate ranges of records that start with G', function() {
        const input = [
            {foo:"G01-G4", bar:'z'}
        ]

        expect(
            SUT.repeatEntries(input, 'foo')
        ).toEqual([
            {foo:"G01", bar:'z'},
            {foo:"G02", bar:'z'},
            {foo:"G03", bar:'z'},
            {foo:"G04", bar:'z'}
        ])
    })

    it('should duplicate ranges of records that start with M', function() {
        const input = [
            {foo:"M01-M4", bar:'z'}
        ]

        expect(
            SUT.repeatEntries(input, 'foo')
        ).toEqual([
            {foo:"M01", bar:'z'},
            {foo:"M02", bar:'z'},
            {foo:"M03", bar:'z'},
            {foo:"M04", bar:'z'}
        ])
    })
});

describe('stripFields', function() {
    it('should remove an fields that begin with an underscore', function() {
        const input = {
            foo:"moo",
            _bar:"mar"
        }

        SUT.stripfields(input)
        expect(input).toEqual({foo:"moo"})
    })

    it('should descend the oject tree if needed', function() {
        const input = {
            foo:"moo",
            bar:{
                baz:"maz",
                _bif:"mif"
            },
            _bat:"bam"
        }

        SUT.stripfields(input)
        expect(input).toEqual({foo:"moo", bar:{baz:"maz"}})
    })
});

describe('urlAsFileName', () => {
    it('should process a full url', () => {
        expect(SUT.urlAsFileName('https://marlinfw.org/docs/gcode/M261.html'))
          .toEqual('https_COLON__FSLASH__FSLASH_marlinfw_DOT_org_FSLASH_docs_FSLASH_gcode_FSLASH_M261_DOT_html')
    })

    it('should Replace forward slashes',() => {
        expect(SUT.urlAsFileName('xxx/xxx')).toEqual('xxx_FSLASH_xxx')
    } )

    it('should Replace colons',() => {
        expect(SUT.urlAsFileName('xxx:xxx')).toEqual('xxx_COLON_xxx')
    })

    it('should Replace dots',() => {
        expect(SUT.urlAsFileName('xxx.xxx')).toEqual('xxx_DOT_xxx')
    })
})
