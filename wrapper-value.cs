namespace NAMESPACE
{
    public class ${filename, ClassName}
    {
        public ${1, string} Value { get; private set; }
        private const int VALUE_LENGTH_CONSTRAINT = 100;


        public ${filename, ClassName}(${1, int} ${2, valueName})
        {
            Value = ${2, valueName};
        }
    }
}
