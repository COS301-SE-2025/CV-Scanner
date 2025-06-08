from tika import parser

parsed = parser.from_file('CV(1).pdf')
print(parsed['content'])
